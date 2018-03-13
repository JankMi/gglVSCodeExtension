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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc2VydmVyL3NyYy9nZ2xQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw2QkFBNkI7QUFDN0Isd0NBQXdDO0FBRXhDLDJDQUE4QztBQUU5Qyx5Q0FBNEU7QUFFNUU7SUF3QkksWUFBWSxRQUFnQixFQUFFLFFBQWdCLEVBQUUsUUFBZTtRQVR2RCxjQUFTLEdBQXVCLEVBQUUsQ0FBQztRQUVuQyxjQUFTLEdBQXVCLEVBQUUsQ0FBQztRQUVuQyxhQUFRLEdBQWUsRUFBRSxDQUFDO1FBQzFCLFlBQU8sR0FBb0IsRUFBRSxDQUFDO1FBS2xDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUE1Qk0sTUFBTSxDQUFDLElBQUk7UUFDZCxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFBQyxTQUFTLENBQUMsVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQUMsQ0FBQztRQUN2RixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDdEUsU0FBUyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFRTSxNQUFNLEtBQUssVUFBVSxLQUFLLE1BQU0sQ0FBQyxT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