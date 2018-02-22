
import * as path from "path";
import * as vscode from "vscode";
import { CompletionItem } from "vscode";
import * as vsTM from "vscode-textmate";
// import * as cp from "child_process";
import { getTokenContent } from "./functions";
import { IGGLCompletionInformation, IGGLDefinitionInformation, IRelativeFile, ISection } from "./gglInterfaces";
import { GGLToken, TokenTypes } from "./gglToken";

export class GGLParser {

    public static init() {
        if (GGLParser.tmRegistry === undefined) { GGLParser.tmRegistry = new vsTM.Registry(); }
        const pathToGrammar = path.join(vscode.extensions.getExtension("mj.genesisvscode").extensionPath, "syntaxes/ggl.tmLanguage.json");
        GGLParser.tmGrammar = GGLParser.tmRegistry.loadGrammarFromPathSync(pathToGrammar);
    }

        private static tmRegistry: vsTM.Registry;
        private static tmGrammar: vsTM.IGrammar;

    private document: vscode.TextDocument;
    public static get TM_Grammar() { return GGLParser.tmGrammar; }
    private tokens: GGLToken[] = [];
    public get Definitions() { return this.tokens; }
    private sections: object[] = []; // level, beginLine, endLine
    private imports: IRelativeFile[] = [];
    public get Sections() { return this.sections; }
    private sectionID: number = 0;

    constructor(document: vscode.TextDocument) {
        if (GGLParser.TM_Grammar === undefined) { GGLParser.init(); }
        this.document = document;
        this.updateTokens();
    }

    public updateTokens(): IRelativeFile[] {
        if (this.document === undefined) { return undefined; }
        const lines = this.readFile(this.document);
        [this.tokens, this.sections, this.imports] = this.getTokensFromString(lines);
        return this.imports;
    }

    private readFile(document): string[] {
        const lines: string[] = [];
        // read lines
        for (let i = 0; i < document.lineCount; i++) {
            let line: vscode.TextLine;
            line = document.lineAt(i);
            lines.push(line.text);
        }
        return lines;
    }

    private getTokensFromString(fileContent): [GGLToken[], ISection[], IRelativeFile[] ] {

        let tokenStack = null;
        let nestedGroupID = 0;
        const nestedGroups: number[] = [nestedGroupID];

        const tokens: GGLToken[] = [];
        const importTokens: GGLToken[] = [];
        const sections: ISection[] = []; // id, begin,end
        const imports: IRelativeFile[] = [];
        // read tokens form lines
        for (let i = 0; i < fileContent.length; i++) {
            const r = GGLParser.tmGrammar.tokenizeLine(fileContent[i], tokenStack);

            r.tokens.forEach((element) => {

                // no ggl named tokens
                if (element.scopes.length >= 2) {
                    if (/[\w.]+ggl[\w.]*/.exec(element.scopes[element.scopes.length - 1])) {
                        const lastScope = element.scopes[element.scopes.length - 1];
                        const strSecEntry = "meta.declaration.ggl.secentry";
                        const strSecExit = "meta.declaration.ggl.secexit";
                        let toPush: GGLToken;
                        if (element.scopes.find((scope: string) => scope === strSecEntry)) {
                            nestedGroups.push(++nestedGroupID);
                            sections.push({
                                beginAtLine: i,
                                endAtLine: i + 100,
                                groupID: nestedGroupID,
                            });
                        } else if (element.scopes.find((scope: string) => scope === strSecExit)) {
                            nestedGroups.pop();
                            const helper = sections.pop();
                            helper.endAtLine = i;
                            sections.push(helper);
                        } else if (lastScope === "entity.name.function.ggl") {
                            toPush = new GGLToken(getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), this.document.fileName);
                            tokens.push(toPush);
                        } else if (lastScope === "variable.other.readwrite.ggl") {
                            toPush = new GGLToken(getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), this.document.fileName);
                            tokens.push(toPush);
                        } else if (lastScope.search("import") >= 0) {
                            toPush = new GGLToken(getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), this.document.fileName);
                            importTokens.push(toPush);
                        }

                    }
                }
            });
            tokenStack = r.ruleStack;
        }
        // interpret tokens
        for (let index = 0; index < importTokens.length; index++) {
            const element = importTokens[index];

            // no comments
            // if (/comment\.\w*/.exec(element.scopes[element.scopes.length - 1]) == null) {
            //     namedTokens.push(new GGLToken(content, TokenTypes.Command, i, nestedGroups, document.fileName));
            // }
            // if (/\bimport[\.\w]*/.exec(element.Scopes[element.Scopes.length - 1])) {
            let importEntry: IRelativeFile;
            importEntry = {
                fileName: importTokens[index + 2].Content,
                rootName: importTokens[index + 1].Content,
            };
            if (imports.find((importPair) => (importPair.rootName === importEntry.rootName && importPair.fileName === importEntry.fileName)) === undefined) {
                imports.push(importEntry);
            }
            index += 2;
            continue;
            // }
        }
        return [tokens, sections, imports];
    }

}
