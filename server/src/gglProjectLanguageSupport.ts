"use strict";
// tslint:disable-next-line:no-var-requires
// import * as vsTM from "C:/Program Files/Microsoft VS Code/resources/app/node_modules/vscode-textmate";

import * as fs from "fs";
import * as vscode from "vscode-languageserver"

import {
    CompletionItem, createConnection, IConnection, InitializedParams, InitializeResult,
    IPCMessageReader, IPCMessageWriter, TextDocumentPositionParams, TextDocuments
} from "vscode-languageserver"


import { logDebug, logError, logInfo } from "./functions";
import { GGLDocument } from "./gglDocument";
import { IGGLBuiltinCompletionInformation, IGGLCompletionInformation, IGGLDefinitionInformation, IGGLSignatureInformation, IRelativeFile } from "./gglInterfaces";
// import { GGLParser } from "./gglParser";
import { GGLVariableToken, TokenTypes } from "./gglToken";

// const regexCompletionInput = /(\s*(\w+))+/;


// Create a connection for the server. The connection uses Node's IPC as a transport
const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
connection.onInitialize((params: InitializedParams): InitializeResult => {
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind,
            // Tell the client that the server support code complete
            completionProvider: {
                resolveProvider: true,
            },
            signatureHelpProvider: {
                triggerCharacters: [`.`]
            },
            definitionProvider: true,
        },
    }
});

connection.onCompletion((documentAndPosition: TextDocumentPositionParams): CompletionItem[] => {
    const builtinCompletionInfos: IGGLBuiltinCompletionInformation[] = GGLProjectLanguageSupport.Instance.provideBuiltinCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    const gglCompletionInfos: IGGLCompletionInformation[] = GGLProjectLanguageSupport.Instance.provideCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    const completionItems: CompletionItem[] = [];
    let toAdd: CompletionItem;
    builtinCompletionInfos.forEach((element: IGGLBuiltinCompletionInformation) => {

        if (element.usages.length !== 0) {
            element.usages.forEach((usage: { functionName: string, call: string }) => {
                toAdd = this.createEnty(element, usage, documentAndPosition.position);
                completionItems.push(toAdd);
            });
        } else {
            toAdd = this.createEnty(element, undefined, documentAndPosition.position);
            completionItems.push(toAdd);
        }
    });
    gglCompletionInfos.forEach((completionInfo: IGGLCompletionInformation) => { completionItems.push({ label: completionInfo.token.Content, kind: completionInfo.type }); })
    return completionItems;
});

// function createEnty(element: IGGLBuiltinCompletionInformation, usage: { functionName: string; call: string; }, position: Position) {
//     const newEntry: CompletionItem = { label: element.label };
//     newEntry.kind = element.type;
//     const documentation: string[] = [];
//     if (usage === undefined) {
//         documentation.push(`usage not found in docu\n`);
//     } else {
//         documentation.push(`${usage.functionName}(${usage.call})\n`);
//     }

//     newEntry.insertText = `${element.label}(`;
//     documentation.push(`returnValue: ${element.returnValue}`);
//     newEntry.documentation = documentation.join("\n");
//     newEntry.detail = element.comment;
//     return newEntry;
// }


connection.onDefinition((documentAndPosition: TextDocumentPositionParams): vscode.Location | undefined => {
    let definitionInfo: IGGLDefinitionInformation | undefined = GGLProjectLanguageSupport.Instance.provideDefinition(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof definitionInfo === typeof undefined) { return undefined; }
    else {
        definitionInfo = definitionInfo as IGGLDefinitionInformation;
        // let definitionResource: string;
        // try {
        //     definitionResource = definitionInfo.file;

        // } catch (error) {
        //     logError("could not create uri\n");
        //     return undefined;
        // }
        const startPos: vscode.Position = { line: definitionInfo.line, character: definitionInfo.startPos };
        const endPos: vscode.Position = { line: definitionInfo.line, character: definitionInfo.endPos };
        const location: vscode.Location = { range: { start: startPos, end: endPos }, uri: definitionInfo.file }
        return location;
    }
})

connection.onSignatureHelp((documentAndPosition: TextDocumentPositionParams): vscode.SignatureHelp | undefined => {
    let signatureInfos: IGGLSignatureInformation[] | undefined = GGLProjectLanguageSupport.Instance.provideSignatureInformations(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof signatureInfos === typeof undefined) { return undefined; }
    else {
        signatureInfos = signatureInfos as IGGLSignatureInformation[];
        let signatureHelpItem: vscode.SignatureInformation;
        const signatureHelpItems: vscode.SignatureInformation[] = [];
        let signatures: vscode.SignatureHelp = { signatures: [], activeParameter: 0, activeSignature: null };
        if (signatureInfos.length === 0) { return signatures; }

        signatureInfos.forEach((signatureInfo) => {
            signatureInfo.usages.forEach((usage) => {
                const theParameters: vscode.ParameterInformation[] = [];
                signatureInfo.params.forEach((parameter) => {
                    theParameters.push({ label: parameter.name, documentation: parameter.description });
                });
                signatureHelpItem = { label: signatureInfo.label, documentation: `${usage.functionName}(${usage.call})`, parameters: theParameters };
                signatureHelpItems.push(signatureHelpItem);
            });
        });
        signatures = { activeParameter: signatureInfos[0].activeParameter, activeSignature: 0, signatures: signatureHelpItems };
        return signatures;
    }
}
);




// tslint:disable-next-line:interface-over-type-literal
type docEntry = {
    name: string,
    description: string,
    usages: Array<{ functionName: string, call: string }>,
    params: Array<{ name: string, description: string }>,
    returnValue: "returnValue",
};

class GGLProjectLanguageSupport {

    private static documents: GGLDocument[] = [];
    private static activeDoc: GGLDocument;
    private static instance: GGLProjectLanguageSupport;
    private static docus: docEntry[];


    private gameRootPath: string;
    private root: string;

    private constructor() {
        GGLProjectLanguageSupport.activeDoc = GGLDocument.createFromTextDoc(documents.all()[0]);
        GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
        const importFiles = GGLProjectLanguageSupport.activeDoc.updateFile();
        const filePath = documents.all()[0].uri.toString();
        const pathArray = filePath.split(/[\\\/]/);
        const file = pathArray[pathArray.length - 1].split(".")[0];
        this.root = pathArray[pathArray.length - 3] + "/" + pathArray[pathArray.length - 2];
        this.gameRootPath = pathArray.slice(0, pathArray.length - 3).join("/");
        logDebug(`gameRootPath: ${this.gameRootPath}`);

        // read builtin doce
        fs.readFile("../../doc/allDocs_doc.json", "utf-8", (errno, fileContent) => {
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
        // logDebug(`file: ${file}, mainFilePath: ${gameRootPath+"/"+root+"/"+"main.ggl"}`);
        const mainPath: string = this.gameRootPath + "/" + this.root + "/" + "main.ggl";
        if (file !== "main" && fs.existsSync(mainPath)) {
            let createdDoc: GGLDocument | undefined = GGLDocument.createFromPair({ rootName: "~", fileName: "main" }, this.gameRootPath, this.root)
            if (typeof createdDoc === typeof undefined){
                const errStr = `could not open main project file: ${mainPath}`;
                logError(errStr);
                throw new Error (errStr);                
            }
            createdDoc = createdDoc as GGLDocument;
            GGLProjectLanguageSupport.documents.push(createdDoc);
            const importFilesI = createdDoc.updateFile();
            if (typeof importFilesI !== typeof undefined){
                this.addImports(importFilesI as IRelativeFile[], file);
            }

        } else {
            logDebug(`no main.ggl in ${this.root} -> no Project?`);
        }
        
        if (typeof importFiles !== typeof undefined){
            (importFiles as IRelativeFile[]).forEach((importPair) => this.addDocument(importPair, this.gameRootPath, this.root));
        }
    }

    public provideCompletions(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): IGGLCompletionInformation[] {

        // const lineContent = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));

        let matchingDef: GGLVariableToken[] = [];
        GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
            logInfo(`search completions in ${searchDocument.Root}@${searchDocument.File}`);

            matchingDef = matchingDef.concat(searchDocument.Parser.VariableDefinitions.filter((canidate) => this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition)));
            matchingDef = matchingDef.concat(searchDocument.Parser.FunctionDefinitions.filter((canidate) => this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition)));
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

        return completions;

    }

    public provideBuiltinCompletions(document: vscode.TextDocument, position: vscode.Position): IGGLBuiltinCompletionInformation[] {

        // const lineContent = document.getText(this.rangeForLineUntilChar(position));

        const content: string | undefined = this.getSearchContent(document, position);
        if (typeof content === typeof undefined) { return [] };
        const prevChar: string = document.getText({ start: { line: position.line, character: position.character - 1 }, end: { line: position.line, character: position.character } });

        const matchingDef: docEntry[] = [];
        GGLProjectLanguageSupport.docus.forEach((docFunc) => {
            if (prevChar === ".") {
                matchingDef.push(docFunc);
                return;
            }
            if (docFunc.name.match(content as string)) {
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

        return completions;

    }

    public provideDefinition(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): IGGLDefinitionInformation | undefined {
        // const range: vscode.Range = this.rangeForLineUntilChar(sourcePosition);

        // const lineContent = sourceDocument.getText(range);
        // const rr = GGLParser.TM_Grammar;
        // const r = GGLParser.TM_Grammar.tokenizeLine(lineContent, new vsStackElement());

        // const searched = this.getSearchContent(sourceDocument, sourcePosition);

        let matchingDef: GGLVariableToken | undefined;
        GGLProjectLanguageSupport.documents.forEach((gglDocument) => {
            // try variables
            let matchingDocDef = gglDocument.Parser.VariableDefinitions.find((element) => this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition)); // searched === element.Content; /(\w+)/.exec(element.Content)[1]);
            // try functions
            if (matchingDocDef === undefined) { matchingDocDef = gglDocument.Parser.FunctionDefinitions.find((element) => this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition)); }
            if (matchingDocDef !== undefined) {
                matchingDef = matchingDocDef;
            }
        });

        if (typeof matchingDef !== typeof undefined) {
            matchingDef = matchingDef as GGLVariableToken;
            const defInfo = {
                endPos: matchingDef.EndPos,
                file: matchingDef.FileName,
                line: matchingDef.LineNumber,
                startPos: matchingDef.StartPos,
            };
            return defInfo;
        } else {
            return undefined;
        }

    }

    public provideSignatureInformations(document: vscode.TextDocument, position: vscode.Position): IGGLSignatureInformation[] | undefined {
        try {
            return this.provideGGLSignatures(document, position).concat(this.provideBuiltinSignatureInformations(document, position));
        } catch (error) {
            logError(`error on creating SignatureInformation[]: ${error.message}`);
        }
    }

    // public onActiveTexteditorChanged(): void {
    //     const newEditor = vscode.window.activeTextEditor;
    //     if (newEditor.document === undefined) { return; }
    //     const existingFile = GGLProjectLanguageSupport.documents.find((element) => newEditor.document.fileName === element.Document.fileName);
    //     if (existingFile === undefined) {
    //         GGLProjectLanguageSupport.activeDoc = GGLDocument.createFromTextDoc(newEditor.document);
    //         GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
    //     } else {
    //         const newDocument = documents.get(GGLProjectLanguageSupport.activeDoc.Document.uri.toString());
    //         GGLProjectLanguageSupport.Instance.updateFileTreeOnDocumentChange(newDocument);
    //         GGLProjectLanguageSupport.activeDoc = existingFile;
    //     }
    // }

    // public onTextDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    //     if (GGLProjectLanguageSupport.activeDoc.Document.fileName !== event.document.uri.toString()) {
    //         logError(`changed Document is not active document!`);
    //     } else if (event.contentChanges.length === 1 && event.contentChanges[0].text.indexOf("\n") >= 0) {
    //         GGLProjectLanguageSupport.Instance.updateFileTreeOnDocumentChange(event.document);
    //     }
    // }

    private rangeForLineUntilChar(srcPosition: vscode.Position): vscode.Range { return { start: { line: srcPosition.line, character: srcPosition.character - 1 }, end: { line: srcPosition.line, character: srcPosition.character } }; }

    // private updateFileTreeOnDocumentChange(newDocument: vscode.TextDocument) {
    //     const pathArray = newDocument.uri.toString().split(/[\\\/]/);
    //     const file = pathArray[pathArray.length - 1].split(".")[0];
    //     GGLProjectLanguageSupport.Instance.addImports(GGLProjectLanguageSupport.activeDoc.reloadDoc(newDocument), file);
    // }

    private provideGGLSignatures(sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): IGGLSignatureInformation[] {

        try {
            const lineContent = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));

            const selectedFunction = this.searchCurrentFunction(lineContent);

            const matchingDef: Array<{ token: GGLVariableToken, parameters: GGLVariableToken[] }> = [];
            GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
                logInfo(`search Signatures in ${searchDocument.Root}@${searchDocument.File}`);

                searchDocument.Parser.FunctionDefinitions.forEach((element) => {
                    if (element.Content === selectedFunction) {
                        matchingDef.push({
                            parameters: element.Parameters,
                            token: element,
                        });
                    }
                });
            });

            const signatures: IGGLSignatureInformation[] = [];
            matchingDef.forEach((element) => {
                // const functionDefinition = /function\s*(\w+)\s*\((.*)\)/.exec(element.sourceLine);
                // const paramsArray: Array<{ name: string, description: string }> = [];
                // if (functionDefinition[2].length > 1) {
                //     const paramsText = functionDefinition[2].split(`,`);
                //     paramsText.forEach((parameter) => {
                //         const parameterMatch = /\s*(\w+)\s*(.*)/.exec(parameter);
                //         paramsArray.push({
                //             description: parameterMatch[2],
                //             name: parameterMatch[1],
                //         });
                //     });
                // }
                const paramsArray: Array<{ name: string, description: string }> = [];
                const paramNames: string[] = [];
                element.parameters.forEach((parameter) => {
                    if (parameter.DefaultValue !== undefined) {
                        paramsArray.push({ name: "var", description: parameter.Content + "=" + parameter.DefaultValue });
                    } else {
                        paramsArray.push({ name: "var", description: parameter.Content });
                    }
                    paramNames.push(`var ${parameter.Content}`);
                });
                const completionInfo: IGGLSignatureInformation = {
                    activeParameter: this.getActiveParameter(lineContent, sourcePosition.character, element.token.Content),
                    comment: `function ${element.token.Content}(${paramNames.join(", ")})`,
                    label: element.token.Content,
                    params: paramsArray,
                    returnValue: "do GGL-Functions have a return value?",
                    usages: [{
                        call: `${paramNames.join(", ")}`,
                        functionName: element.token.Content,
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
            const lineContent = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));

            const selectedFunction = this.searchCurrentFunction(lineContent);

            const matchingDef: docEntry[] = [];
            GGLProjectLanguageSupport.docus.forEach((docFunc) => {
                if (docFunc.name === selectedFunction) {
                    matchingDef.push(docFunc);
                    return;
                }
            });

            const signatures: IGGLSignatureInformation[] = [];
            matchingDef.forEach((element) => {
                // const kind: vscode.CompletionItemKind = vscode.CompletionItemKind.Method;
                const completionInfo: IGGLSignatureInformation = {
                    activeParameter: this.getActiveParameter(lineContent, sourcePosition.character, element.name),
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

    private searchCurrentFunction(content: string, functionTree: string[] = []): string | undefined {
        const posOpening = content.indexOf("(");
        const posClosing = content.indexOf(")");
        if ((posClosing < posOpening || posOpening < 0) && posClosing >= 0) {                                                                // funktion closed, move one up
            functionTree.pop();
            let remainingContent: string[] = content.split(")");
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(")"), functionTree);
        } else if (posClosing < 0 && posOpening < 0) {                                                                  // no further calls, end of recursion
            return functionTree.pop();
        } else {                                                                                                        // next is a funciton call
            let selectedFunction: RegExpExecArray | null = /(\w+)\s*\(/.exec(content);
            if (typeof selectedFunction === typeof null) {
                throw new Error("could not extract function");
            }
            selectedFunction = selectedFunction as RegExpExecArray;
            functionTree.push(selectedFunction[1]);
            let remainingContent: string[] = content.split(selectedFunction[0]);
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(selectedFunction[0]), functionTree);
        }
    }

    private getActiveParameter(text: string, position: number, functionName: string): number {
        let substring: string | undefined = text.substr(0, position);
        substring = (substring as string).split(functionName).pop();
        substring = (substring as string).split("(").slice(1).join("(");
        substring = (substring as string).split(/\w*\([\w ,\(\=\)\[\]]*\)/).join("");
        const substrings = (substring as string).split(",");
        if (substrings === null) {
            return 0;
        } else {
            return substrings.length - 1;
        }
    }

    public static get Instance() {
        return GGLProjectLanguageSupport.instance || (GGLProjectLanguageSupport.instance = new this());
    }

    private addImports(importFilesI: IRelativeFile[], file: string) {
        const mainImportFiles: IRelativeFile[] = [];
        importFilesI.forEach((importFile) => {
            if (importFile.rootName !== "~") {
                mainImportFiles.push(importFile);
            } else if (importFile.fileName === file) {
                logDebug(`file is direct include`);
            } else {
                logDebug(`include file: ${this.root}@${importFile.fileName}`);
                mainImportFiles.push(importFile);
            }
        });
        mainImportFiles.forEach((pair) => this.addDocument(pair, this.gameRootPath, this.root));
    }

    private addDocument(importFileLocation: IRelativeFile, rootPath: string, subRoot: string): void {
        const doc = GGLProjectLanguageSupport.documents.find((document: GGLDocument) => document.Root === importFileLocation.rootName && document.File === importFileLocation.fileName);
        if (doc !== undefined) {
            return;
        }
        let newDoc : GGLDocument|undefined = GGLDocument.createFromPair(importFileLocation, rootPath, subRoot)
        if (typeof newDoc !== typeof undefined){
            newDoc = newDoc as GGLDocument;
            GGLProjectLanguageSupport.documents.push(newDoc);
            logInfo(`document: ${newDoc.Root}@${newDoc.File} added`);
        }
    }

    private getSearchContent(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const lineContent: string = document.getText(this.rangeForLineUntilChar(position));
        const content: RegExpExecArray | null = /\w+/g.exec(lineContent);
        if (typeof content === typeof null) { return undefined } else { return (content as RegExpExecArray).pop() }
    }

    private findMatichingElement(canidate: GGLVariableToken, searchDocument: GGLDocument, sourceDocument: vscode.TextDocument, sourcePosition: vscode.Position): boolean {
        try {
            // in scope, if 0->global or in same file
            if (canidate.NestedGroups.length !== 1 && canidate.FileName !== `${searchDocument.Root}@${searchDocument.File}`) { return false; }

            let content: string | undefined = this.getSearchContent(sourceDocument, sourcePosition);

            if (typeof content === typeof undefined) {
                throw new Error("could not find search content");
            } else {
                content = content as string;
                // global candidate -> check if names match
                if (canidate.NestedGroups.length === 1) {
                    if (canidate.Type !== TokenTypes.FunctionDeclatation && canidate.Type !== TokenTypes.VariableDeclaration) { return false; }
                    const isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }

                // local candidate, check if group match -> check if names match
                const groups: number[] = [];
                groups.push(0);
                searchDocument.Parser.Sections.forEach((section) => {
                    if (sourcePosition.line >= section.beginAtLine && sourcePosition.line <= section.endAtLine) { groups.push(section.groupID); }
                });

                // in same scope to do
                canidate.NestedGroups.sort();
                const sharedGroup = groups.indexOf(canidate.NestedGroups[canidate.NestedGroups.length - 1]) < 0 ? false : true;
                if (sharedGroup) {
                    // since same scope search matches
                    if (canidate.Type !== TokenTypes.FunctionDeclatation && canidate.Type !== TokenTypes.VariableDeclaration) { return false; }
                    const isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }
                return false;

            }
        } catch (errObj) {
            if (typeof errObj === typeof Error) {
                const err: Error = errObj as Error;
                logError(`findMatchingElement threw exception: ${err.name}, ${err.message}`);
                if (typeof err.stack !== typeof undefined) { logError(`callstack:\n ${err.stack}`); } else { logError(`no stack`) }
            }
            return false;
        }
    }

}

// Listen on the connection
connection.listen();