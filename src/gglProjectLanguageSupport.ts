"use strict";
// tslint:disable-next-line:no-var-requires
// import * as vsTM from "C:/Program Files/Microsoft VS Code/resources/app/node_modules/vscode-textmate";
import * as vsTM from "vscode-textmate";

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { CompletionItem } from "vscode";
import { getTokenContent, logDebug, logError, logInfo } from "./functions";
import { GGLDocument } from "./gglDocument";
import { IGGLBuiltinCompletionInformation, IGGLCompletionInformation, IGGLDefinitionInformation, IGGLSignatureInformation, IRelativeFile } from "./gglInterfaces";
import { GGLParser } from "./gglParser";
import { GGLToken, TokenTypes } from "./gglToken";

const regexCompletionInput = /(\s*(\w+))+/;

// tslint:disable-next-line:interface-over-type-literal
type docEntry = {
    name: string,
    description: string,
    usages: Array<{ functionName: string, call: string }>,
    params: Array<{ name: string, description: string }>,
    returnValue: "returnValue",
};

export class GGLProjectLanguageSupport {

    private static documents: GGLDocument[] = [];
    private static activeDoc: GGLDocument;
    private static instance: GGLProjectLanguageSupport;
    private static docus: docEntry[];

    private constructor() {
        GGLProjectLanguageSupport.activeDoc = GGLDocument.createFromTextDoc(vscode.window.activeTextEditor.document);
        GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
        const importFiles = GGLProjectLanguageSupport.activeDoc.updateFile();
        const filePath = GGLProjectLanguageSupport.activeDoc.Document.fileName;
        const pathArray = filePath.split("\\");
        const file = pathArray[pathArray.length - 1].split(".")[0];
        const root = pathArray[pathArray.length - 3] + "\\" + pathArray[pathArray.length - 2];
        const gameRootPath = pathArray.slice(0, pathArray.length - 3).join("/");

        // read builtin doce
        const extensions = vscode.extensions;
        const extInfo = this.provideBuiltinSignatureInformations;
        fs.readFile(path.join(vscode.extensions.getExtension("JankMi.genesisvscode").extensionPath, "doc/allDocs_doc.json"), "utf-8", (errno, fileContent) => {
            if (errno !== null) {
                logError("error on file read: " + errno.message);
                return;
            }
            const docs = JSON.parse(fileContent);
            if (GGLProjectLanguageSupport.docus === undefined) {
                GGLProjectLanguageSupport.docus = docs;
            } else { GGLProjectLanguageSupport.docus.push(docs); }
        });

        // if not main project file, import main.ggl too
        if (file !== "main" && fs.existsSync(gameRootPath + "/" + root + "/" + "main.ggl")) {
            GGLDocument.createFromPair({ rootName: "~", fileName: "main" }, gameRootPath, root).then((doc) => {
                GGLProjectLanguageSupport.documents.push(doc.document);
                const importFilesI = doc.document.updateFile();
                const mainImportFiles: IRelativeFile[] = [];
                importFilesI.forEach((importFile) => {
                    if (importFile.rootName !== "~") {
                        mainImportFiles.push(importFile);
                    } else if (importFile.fileName === file) {
                        logDebug(`file is direct include`);
                    } else {
                        logDebug(`include file: ${root}@${importFile.fileName}`);
                        mainImportFiles.push(importFile);
                    }
                });
                mainImportFiles.forEach((pair) => this.addDocument(pair, gameRootPath, root));
            });
        } else {
            logDebug(`no main.ggl in ${root} -> no Project?`);
        }

        importFiles.forEach((importPair) => this.addDocument(importPair, gameRootPath, root));
    }

    public provideCompletions(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position, token: vscode.CancellationToken): Promise<IGGLCompletionInformation[]> {

        return new Promise<IGGLCompletionInformation[]>((resolve, reject) => {
            const lineContent = sourceDocument.lineAt(sourcePosition.line).text;

            let matchingDef: GGLToken[] = [];
            GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
                logInfo(`search completions in ${searchDocument.Root}@${searchDocument.File}`);

                matchingDef = matchingDef.concat(searchDocument.Parser.Definitions.filter((element) => this.findMatichingElement(element, searchDocument, sourceDocument, sourcePosition)));
            });

            const completions: IGGLCompletionInformation[] = [];
            matchingDef.forEach((element) => {
                let kind: vscode.CompletionItemKind;
                switch (element.Type) {
                    case TokenTypes.FunctionDeclatation:
                        kind = vscode.CompletionItemKind.Function;
                        break;
                    case TokenTypes.VariableDeclaration:
                        kind = vscode.CompletionItemKind.Variable;
                        break;
                    default:
                        kind = vscode.CompletionItemKind.Field;
                }
                const completionInfo = {
                    token: element,
                    type: kind,
                };
                completions.push(completionInfo);
            });

            return resolve(completions);

        });
    }

    public provideBuiltinCompletions(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<IGGLBuiltinCompletionInformation[]> {

        return new Promise<IGGLBuiltinCompletionInformation[]>((resolve, reject) => {
            const lineContent = document.lineAt(position.line).text;

            const content: string = this.getSearchContent(document, position);
            const prevChar: string = document.getText(new vscode.Range(new vscode.Position(position.line, position.character - 1), position));

            const matchingDef: docEntry[] = [];
            GGLProjectLanguageSupport.docus.forEach((docFunc) => {
                if (prevChar === ".") {
                    matchingDef.push(docFunc);
                    return;
                }
                if (docFunc.name.match(content)) {
                    matchingDef.push(docFunc);
                    return;
                }
            });

            const completions: IGGLBuiltinCompletionInformation[] = [];
            matchingDef.forEach((element) => {
                const kind: vscode.CompletionItemKind = vscode.CompletionItemKind.Method;
                const completionInfo: IGGLBuiltinCompletionInformation = {
                    comment: element.description,
                    label: element.name,
                    params: element.params,
                    returnValue: element.returnValue,
                    type: kind,
                    usages: element.usages,
                };
                completions.push(completionInfo);
            });

            return resolve(completions);

        });
    }

    public provideDefinition(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position, token: vscode.CancellationToken): Promise<IGGLDefinitionInformation> {
        // let p: cp.ChildProcess;
        // if (token) {
        //     token.onCancellationRequested(() => stuff.killProcess(p));
        // }
        return new Promise<IGGLDefinitionInformation>((resolve, reject) => {
            const lineContent = sourceDocument.lineAt(sourcePosition.line);
            const stack: vsTM.StackElement = undefined;
            const rr = GGLParser.TM_Grammar;
            const r = GGLParser.TM_Grammar.tokenizeLine(lineContent.text, stack);

            const searched = this.getSearchContent(sourceDocument, sourcePosition);

            let matchingDef: GGLToken;
            GGLProjectLanguageSupport.documents.forEach((gglDocument) => {
                const matchingDocDef = gglDocument.Parser.Definitions.find((element) => this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition)); // searched === element.Content; /(\w+)/.exec(element.Content)[1]);
                if (matchingDocDef !== undefined) {
                    matchingDef = matchingDocDef;
                }
            });

            if (matchingDef === undefined) { return reject("not found"); }
            // var location: vscode.Location;
            // location.range = new vscode.Range(new vscode.Position(matchingDef.LineNumber, matchingDef.StartPos), new vscode.Position(matchingDef.LineNumber, matchingDef.EndPos))
            // location.uri = vscode.Uri.file(matchingDef.FileName);
            const defInfo = {
                endPos: matchingDef.EndPos,
                file: matchingDef.FileName,
                line: matchingDef.LineNumber,
                startPos: matchingDef.StartPos,
            };
            // var uri = vscode.Uri.file(matchingDef.FileName);
            // var range = new vscode.Range(new vscode.Position(matchingDef.LineNumber, matchingDef.StartPos), new vscode.Position(matchingDef.LineNumber, matchingDef.EndPos))
            return resolve(defInfo);

        });
    }

    public provideSignatureInformations(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<IGGLSignatureInformation[]> {
        return new Promise<IGGLSignatureInformation[]>((resolve, reject) => {
            try {
                return resolve(this.provideGGLSignatures(document, position).concat(this.provideBuiltinSignatureInformations(document, position)));
            } catch (error) {
                logError(`error on creating SignatureInformation[]: ${error.message}`);
            }
        });
    }

    public onActiveTexteditorChanged(): void {
        const newEditor = vscode.window.activeTextEditor;
        if (newEditor.document === undefined) { return; }
        const existingFile = GGLProjectLanguageSupport.documents.find((element) => newEditor.document.fileName === element.Document.fileName);
        if (existingFile === undefined) {
            GGLProjectLanguageSupport.activeDoc = GGLDocument.createFromTextDoc(newEditor.document);
            GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
        } else {
            GGLProjectLanguageSupport.activeDoc = existingFile;
        }

    }

    private provideGGLSignatures(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): IGGLSignatureInformation[] {

        try {
            const lineContent = sourceDocument.lineAt(sourcePosition.line).text;

            const selectedFunction: string = /(\w+)\(.*\)/.exec(lineContent)[1];

            const matchingDef: Array<{ token: GGLToken, sourceLine: string }> = [];
            GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
                logInfo(`search Signatures in ${searchDocument.Root}@${searchDocument.File}`);

                searchDocument.Parser.Definitions.forEach((element) => {
                    if (element.Type === TokenTypes.FunctionDeclatation && element.Content === selectedFunction) {
                        matchingDef.push({
                            sourceLine: searchDocument.Document.lineAt(element.LineNumber).text,
                            token: element,
                        });
                    }
                });
            });

            const signatures: IGGLSignatureInformation[] = [];
            matchingDef.forEach((element) => {
                const functionDefinition = /function\s*(\w+)\s*\((.*)\)/.exec(element.sourceLine);
                const paramsArray: Array<{ name: string, description: string }> = [];
                if (functionDefinition[2].length > 1) {
                    const paramsText = functionDefinition[2].split(`,`);
                    paramsText.forEach((parameter) => {
                        const parameterMatch = /\s*(\w+)\s*(.*)/.exec(parameter);
                        paramsArray.push({
                            description: parameterMatch[2],
                            name: parameterMatch[1],
                        });
                    });
                }
                const completionInfo: IGGLSignatureInformation = {
                    activeParameter: this.getActiveParameter(lineContent, sourcePosition.character),
                    comment: `function ${functionDefinition[1]}(${functionDefinition[2]})`,
                    label: element.token.Content,
                    params: paramsArray,
                    returnValue: "do GGL-Functions have a return value?",
                    usages: [{
                        call: `${functionDefinition[1]}(${functionDefinition[2]})`,
                        functionName: functionDefinition[1],
                    }],
                };
                signatures.push(completionInfo);
            });

            return signatures;
        } catch (error) {
            logError(`error on creating GGLSignatureInformation[]: ${error.message}`);
            const signatures: IGGLSignatureInformation[] = [];
            return signatures;
        }

    }

    private provideBuiltinSignatureInformations(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): IGGLSignatureInformation[] {
        try {
            const lineContent = sourceDocument.lineAt(sourcePosition.line).text;

            const selectedFunction: string = /(\w+)\(.*\)/.exec(lineContent)[1];

            const matchingDef: docEntry[] = [];
            GGLProjectLanguageSupport.docus.forEach((docFunc) => {
                if (docFunc.name === selectedFunction) {
                    matchingDef.push(docFunc);
                    return;
                }
            });

            const signatures: IGGLSignatureInformation[] = [];
            matchingDef.forEach((element) => {
                const kind: vscode.CompletionItemKind = vscode.CompletionItemKind.Method;
                const completionInfo: IGGLSignatureInformation = {
                    activeParameter: this.getActiveParameter(lineContent, sourcePosition.character),
                    comment: element.description,
                    label: element.name,
                    params: element.params,
                    returnValue: element.returnValue,
                    usages: element.usages,
                };
                signatures.push(completionInfo);
            });

            return signatures;
        } catch (error) {
            logError(`error on creating BuiltinSignatureInformation[]: ${error.message}`);
            const signatures: IGGLSignatureInformation[] = [];
            return signatures;
        }
    }

    private getActiveParameter(text: string, position: number): number {
        let substring: string = text.substr(0, position);
        substring = substring.split("(").pop();
        const substrings = substring.split(",");
        return substrings.length - 1;
    }

    public static get Instance() {
        return GGLProjectLanguageSupport.instance || (GGLProjectLanguageSupport.instance = new this());
    }

    private addDocument(importFileLocation: IRelativeFile, rootPath: string, subRoot: string): void {
        const doc = GGLProjectLanguageSupport.documents.find((document: GGLDocument) => document.Root === importFileLocation.rootName && document.File === importFileLocation.fileName);
        if (doc !== undefined) {
            return;
        }
        GGLDocument.createFromPair(importFileLocation, rootPath, subRoot).then((newDoc) => {
            GGLProjectLanguageSupport.documents.push(newDoc.document);
        });
    }

    private getSearchContent(document: vscode.TextDocument, position: vscode.Position) {
        const contentRange: vscode.Range = document.getWordRangeAtPosition(position);
        const content: string = document.getText(contentRange);
        return content;
    }

    private findMatichingElement(element: GGLToken, searchDocument: GGLDocument, sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): boolean {
        const content: string = this.getSearchContent(sourceDocument, sourcePosition);

        const groups: number[] = [];
        groups.push(0);
        searchDocument.Parser.Sections.forEach((section) => {
            if (sourcePosition.line >= section.beginAtLine && sourcePosition.line <= section.endAtLine) { groups.push(section.groupID); }
        });
        // in scope, if 0->global or in same file
        if (element.NestedGroups[0] !== 0 && element.FileName !== searchDocument.Document.fileName) { return false; }

        // in same scope to do
        element.NestedGroups.sort();
        const sharedGroup = groups.indexOf(element.NestedGroups[element.NestedGroups.length - 1]) < 0 ? false : true;
        if (sharedGroup) {
            // since same scope search matches
            if (element.Type !== TokenTypes.FunctionDeclatation && element.Type !== TokenTypes.VariableDeclaration) { return false; }
            const isFound = element.Content.indexOf(content) >= 0;
            return isFound;
        }

    }
}
