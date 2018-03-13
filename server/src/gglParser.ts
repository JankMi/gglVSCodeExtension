
import * as path from "path";
import * as vsTM from "vscode-textmate";
// import * as cp from "child_process";
import { getTokenContent } from "./functions";
import { IRelativeFile, ISection } from "./gglInterfaces";
import { GGLFunctionToken, GGLVariableToken, TokenTypes } from "./gglToken";

export class GGLParser {

    public static init() {
        if (GGLParser.tmRegistry === undefined) { GGLParser.tmRegistry = new vsTM.Registry(); }
        const pathToGrammar = path.join("../../syntaxes/ggl.tmLanguage.json");
        GGLParser.tmGrammar = GGLParser.tmRegistry.loadGrammarFromPathSync(pathToGrammar);
    }

    private static tmRegistry: vsTM.Registry;
    private static tmGrammar: vsTM.IGrammar;

    private document: string;
    private rootName: string;
    private fileName: string;
    public static get TM_Grammar() { return GGLParser.tmGrammar; }
    private variables: GGLVariableToken[] = [];
    public get VariableDefinitions() { return this.variables; }
    private functions: GGLFunctionToken[] = [];
    public get FunctionDefinitions() { return this.functions; }
    private sections: ISection[] = []; // level, beginLine, endLine
    private imports: IRelativeFile[] = [];
    public get Sections() { return this.sections; }
    // private sectionID: number = 0;

    constructor(document: string, rootName: string, fileName:string) {
        if (GGLParser.TM_Grammar === undefined) { GGLParser.init(); }
        this.document = document;
        this.rootName = rootName;
        this.fileName = fileName;
        this.updateTokens();
    }

    public updateTokens(): IRelativeFile[] | undefined {
        if (this.document === undefined) { return undefined; }
        [this.variables, this.functions, this.sections, this.imports] = this.getTokensFromString(this.document);
        return this.imports;
    }

    // private readFile(document): string[] {
    //     const lines: string[] = [];
    //     // read lines
    //     for (let i = 0; i < document.lineCount; i++) {
    //         let line: vscode.TextLine;
    //         line = document.lineAt(i);
    //         lines.push(line.text);
    //     }
    //     return lines;
    // }

    private getTokensFromString(fileContent: string): [GGLVariableToken[], GGLFunctionToken[], ISection[], IRelativeFile[]] {

        let tokenStack = null;
        let nestedGroupID = 0;
        const nestedGroups: number[] = [nestedGroupID];

        const functionDeclarations: GGLFunctionToken[] = [];
        const variableDeclarations: GGLVariableToken[] = [];
        const importTokens: GGLVariableToken[] = [];
        const sections: ISection[] = []; // id, begin,end
        const imports: IRelativeFile[] = [];
        // read tokens form lines
        for (let i = 0; i < fileContent.length; i++) {
            const r = GGLParser.tmGrammar.tokenizeLine(fileContent[i], tokenStack);

            // const tokens = r.tokens;
            r.tokens.forEach((element : vsTM.IToken) => {

                // no ggl named tokens
                if (element.scopes.length >= 2) {
                    if (/[\w.]+ggl[\w.]*/.exec(element.scopes[element.scopes.length - 1])) {
                        const lastScope = element.scopes[element.scopes.length - 1];
                        const strSecEntry = "meta.declaration.ggl.secentry";
                        const strSecExit = "meta.declaration.ggl.secexit";
                        let toPush: GGLVariableToken;
                        if (element.scopes.find((scope: string) => scope === strSecEntry)) {
                            nestedGroups.push(++nestedGroupID);
                            sections.push({
                                beginAtLine: i,
                                endAtLine: i + 1000,
                                groupID: nestedGroupID,
                            });
                        } else if (element.scopes.find((scope: string) => scope === strSecExit)) {
                            const closedGroupID = nestedGroups.pop();
                            const section: ISection|undefined = sections.find((possibleSection: ISection | undefined) => {
                                if (typeof possibleSection !== typeof undefined) {
                                    return ((possibleSection as ISection).groupID === closedGroupID); 
                                } else { return false ;}
                            });
                            if(typeof section !== undefined) {
                                (section as ISection).endAtLine = i;
                            }
                        } else if (lastScope.search("entity.name.function.ggl") >= 0) {
                            const toPushFunc = new GGLFunctionToken(getTokenContent(fileContent[i], element), ([] as string[]).concat(element.scopes), i, element.startIndex, element.endIndex, ([] as number[]).concat(nestedGroups), `${this.rootName}@${this.fileName}`);
                            functionDeclarations.push(toPushFunc);
                        } else if (lastScope === "variable.other.readwrite.ggl") {
                            toPush = new GGLVariableToken(getTokenContent(fileContent[i], element), ([] as string[]).concat(element.scopes), i, element.startIndex, element.endIndex, ([] as number[]).concat(nestedGroups), `${this.rootName}@${this.fileName}`, TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                        } else if (lastScope === "variable.other.readwrite.ggl.local") {
                            toPush = new GGLVariableToken(getTokenContent(fileContent[i], element), ([] as string[]).concat(element.scopes), i, element.startIndex, element.endIndex, ([] as number[]).concat(nestedGroups.concat(nestedGroupID + 1)), `${this.rootName}@${this.fileName}`, TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                            functionDeclarations[functionDeclarations.length - 1].Parameters.push(toPush);
                        } else if (lastScope.search("import") >= 0) {
                            toPush = new GGLVariableToken(getTokenContent(fileContent[i], element), ([] as string[]).concat(element.scopes), i, element.startIndex, element.endIndex, ([] as number[]).concat(nestedGroups), `${this.rootName}@${this.fileName}`, TokenTypes.Keyword);
                            importTokens.push(toPush);
                        } else if (lastScope === "meta.tag.defaultValue.ggl") {
                            variableDeclarations[variableDeclarations.length - 1].DefaultValue = getTokenContent(fileContent[i], element);
                            functionDeclarations[functionDeclarations.length - 1].Parameters[functionDeclarations[functionDeclarations.length - 1].Parameters.length - 1].DefaultValue = getTokenContent(fileContent[i], element);
                        }

                    }
                }
            });
            tokenStack = r.ruleStack;
        }
        // interpret tokens
        for (let index = 0; index < importTokens.length; index++) {
            // const element = importTokens[index];

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
        return [variableDeclarations, functionDeclarations, sections, imports];
    }

}
