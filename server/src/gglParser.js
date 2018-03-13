"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vsTM = require("vscode-textmate");
const functions_1 = require("./functions");
const gglToken_1 = require("./gglToken");
class GGLParser {
    constructor(document, rootName, fileName) {
        this.variables = [];
        this.functions = [];
        this.sections = [];
        this.imports = [];
        if (GGLParser.TM_Grammar === undefined) {
            GGLParser.init();
        }
        this.document = document;
        this.rootName = rootName;
        this.fileName = fileName;
        this.updateTokens();
    }
    static init() {
        if (GGLParser.tmRegistry === undefined) {
            GGLParser.tmRegistry = new vsTM.Registry();
        }
        const pathToGrammar = path.join("../../syntaxes/ggl.tmLanguage.json");
        GGLParser.tmGrammar = GGLParser.tmRegistry.loadGrammarFromPathSync(pathToGrammar);
    }
    static get TM_Grammar() { return GGLParser.tmGrammar; }
    get VariableDefinitions() { return this.variables; }
    get FunctionDefinitions() { return this.functions; }
    get Sections() { return this.sections; }
    updateTokens() {
        if (this.document === undefined) {
            return undefined;
        }
        [this.variables, this.functions, this.sections, this.imports] = this.getTokensFromString(this.document);
        return this.imports;
    }
    getTokensFromString(fileContent) {
        let tokenStack = null;
        let nestedGroupID = 0;
        const nestedGroups = [nestedGroupID];
        const functionDeclarations = [];
        const variableDeclarations = [];
        const importTokens = [];
        const sections = [];
        const imports = [];
        for (let i = 0; i < fileContent.length; i++) {
            const r = GGLParser.tmGrammar.tokenizeLine(fileContent[i], tokenStack);
            r.tokens.forEach((element) => {
                if (element.scopes.length >= 2) {
                    if (/[\w.]+ggl[\w.]*/.exec(element.scopes[element.scopes.length - 1])) {
                        const lastScope = element.scopes[element.scopes.length - 1];
                        const strSecEntry = "meta.declaration.ggl.secentry";
                        const strSecExit = "meta.declaration.ggl.secexit";
                        let toPush;
                        if (element.scopes.find((scope) => scope === strSecEntry)) {
                            nestedGroups.push(++nestedGroupID);
                            sections.push({
                                beginAtLine: i,
                                endAtLine: i + 1000,
                                groupID: nestedGroupID,
                            });
                        }
                        else if (element.scopes.find((scope) => scope === strSecExit)) {
                            const closedGroupID = nestedGroups.pop();
                            const section = sections.find((possibleSection) => {
                                if (typeof possibleSection !== typeof undefined) {
                                    return (possibleSection.groupID === closedGroupID);
                                }
                                else {
                                    return false;
                                }
                            });
                            if (typeof section !== undefined) {
                                section.endAtLine = i;
                            }
                        }
                        else if (lastScope.search("entity.name.function.ggl") >= 0) {
                            const toPushFunc = new gglToken_1.GGLFunctionToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), `${this.rootName}@${this.fileName}`);
                            functionDeclarations.push(toPushFunc);
                        }
                        else if (lastScope === "variable.other.readwrite.ggl") {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), `${this.rootName}@${this.fileName}`, gglToken_1.TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                        }
                        else if (lastScope === "variable.other.readwrite.ggl.local") {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups.concat(nestedGroupID + 1)), `${this.rootName}@${this.fileName}`, gglToken_1.TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                            functionDeclarations[functionDeclarations.length - 1].Parameters.push(toPush);
                        }
                        else if (lastScope.search("import") >= 0) {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), `${this.rootName}@${this.fileName}`, gglToken_1.TokenTypes.Keyword);
                            importTokens.push(toPush);
                        }
                        else if (lastScope === "meta.tag.defaultValue.ggl") {
                            variableDeclarations[variableDeclarations.length - 1].DefaultValue = functions_1.getTokenContent(fileContent[i], element);
                            functionDeclarations[functionDeclarations.length - 1].Parameters[functionDeclarations[functionDeclarations.length - 1].Parameters.length - 1].DefaultValue = functions_1.getTokenContent(fileContent[i], element);
                        }
                    }
                }
            });
            tokenStack = r.ruleStack;
        }
        for (let index = 0; index < importTokens.length; index++) {
            let importEntry;
            importEntry = {
                fileName: importTokens[index + 2].Content,
                rootName: importTokens[index + 1].Content,
            };
            if (imports.find((importPair) => (importPair.rootName === importEntry.rootName && importPair.fileName === importEntry.fileName)) === undefined) {
                imports.push(importEntry);
            }
            index += 2;
            continue;
        }
        return [variableDeclarations, functionDeclarations, sections, imports];
    }
}
exports.GGLParser = GGLParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2dsUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsNkJBQTZCO0FBQzdCLHdDQUF3QztBQUV4QywyQ0FBOEM7QUFFOUMseUNBQTRFO0FBRTVFO0lBd0JJLFlBQVksUUFBZ0IsRUFBRSxRQUFnQixFQUFFLFFBQWU7UUFUdkQsY0FBUyxHQUF1QixFQUFFLENBQUM7UUFFbkMsY0FBUyxHQUF1QixFQUFFLENBQUM7UUFFbkMsYUFBUSxHQUFlLEVBQUUsQ0FBQztRQUMxQixZQUFPLEdBQW9CLEVBQUUsQ0FBQztRQUtsQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBNUJNLE1BQU0sQ0FBQyxJQUFJO1FBQ2QsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFDdkYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3RFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBUU0sTUFBTSxLQUFLLFVBQVUsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxD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