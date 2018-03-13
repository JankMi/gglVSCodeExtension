"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var vsTM = require("vscode-textmate");
var functions_1 = require("./functions");
var gglToken_1 = require("./gglToken");
var GGLParser = (function () {
    function GGLParser(document, rootName, fileName) {
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
    GGLParser.init = function () {
        if (GGLParser.tmRegistry === undefined) {
            GGLParser.tmRegistry = new vsTM.Registry();
        }
        var pathToGrammar = path.join("../../syntaxes/ggl.tmLanguage.json");
        GGLParser.tmGrammar = GGLParser.tmRegistry.loadGrammarFromPathSync(pathToGrammar);
    };
    Object.defineProperty(GGLParser, "TM_Grammar", {
        get: function () { return GGLParser.tmGrammar; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLParser.prototype, "VariableDefinitions", {
        get: function () { return this.variables; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLParser.prototype, "FunctionDefinitions", {
        get: function () { return this.functions; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLParser.prototype, "Sections", {
        get: function () { return this.sections; },
        enumerable: true,
        configurable: true
    });
    GGLParser.prototype.updateTokens = function () {
        if (this.document === undefined) {
            return undefined;
        }
        _a = this.getTokensFromString(this.document), this.variables = _a[0], this.functions = _a[1], this.sections = _a[2], this.imports = _a[3];
        return this.imports;
        var _a;
    };
    GGLParser.prototype.getTokensFromString = function (fileContent) {
        var _this = this;
        var tokenStack = null;
        var nestedGroupID = 0;
        var nestedGroups = [nestedGroupID];
        var functionDeclarations = [];
        var variableDeclarations = [];
        var importTokens = [];
        var sections = [];
        var imports = [];
        var _loop_1 = function (i) {
            var r = GGLParser.tmGrammar.tokenizeLine(fileContent[i], tokenStack);
            r.tokens.forEach(function (element) {
                if (element.scopes.length >= 2) {
                    if (/[\w.]+ggl[\w.]*/.exec(element.scopes[element.scopes.length - 1])) {
                        var lastScope = element.scopes[element.scopes.length - 1];
                        var strSecEntry_1 = "meta.declaration.ggl.secentry";
                        var strSecExit_1 = "meta.declaration.ggl.secexit";
                        var toPush = void 0;
                        if (element.scopes.find(function (scope) { return scope === strSecEntry_1; })) {
                            nestedGroups.push(++nestedGroupID);
                            sections.push({
                                beginAtLine: i,
                                endAtLine: i + 1000,
                                groupID: nestedGroupID,
                            });
                        }
                        else if (element.scopes.find(function (scope) { return scope === strSecExit_1; })) {
                            var closedGroupID_1 = nestedGroups.pop();
                            var section = sections.find(function (possibleSection) {
                                if (typeof possibleSection !== typeof undefined) {
                                    return (possibleSection.groupID === closedGroupID_1);
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
                            var toPushFunc = new gglToken_1.GGLFunctionToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), _this.rootName + "@" + _this.fileName);
                            functionDeclarations.push(toPushFunc);
                        }
                        else if (lastScope === "variable.other.readwrite.ggl") {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), _this.rootName + "@" + _this.fileName, gglToken_1.TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                        }
                        else if (lastScope === "variable.other.readwrite.ggl.local") {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups.concat(nestedGroupID + 1)), _this.rootName + "@" + _this.fileName, gglToken_1.TokenTypes.VariableDeclaration);
                            variableDeclarations.push(toPush);
                            functionDeclarations[functionDeclarations.length - 1].Parameters.push(toPush);
                        }
                        else if (lastScope.search("import") >= 0) {
                            toPush = new gglToken_1.GGLVariableToken(functions_1.getTokenContent(fileContent[i], element), [].concat(element.scopes), i, element.startIndex, element.endIndex, [].concat(nestedGroups), _this.rootName + "@" + _this.fileName, gglToken_1.TokenTypes.Keyword);
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
        };
        for (var i = 0; i < fileContent.length; i++) {
            _loop_1(i);
        }
        var _loop_2 = function (index) {
            var importEntry;
            importEntry = {
                fileName: importTokens[index + 2].Content,
                rootName: importTokens[index + 1].Content,
            };
            if (imports.find(function (importPair) { return (importPair.rootName === importEntry.rootName && importPair.fileName === importEntry.fileName); }) === undefined) {
                imports.push(importEntry);
            }
            index += 2;
            return out_index_1 = index, "continue";
            out_index_1 = index;
        };
        var out_index_1;
        for (var index = 0; index < importTokens.length; index++) {
            _loop_2(index);
            index = out_index_1;
        }
        return [variableDeclarations, functionDeclarations, sections, imports];
    };
    return GGLParser;
}());
exports.GGLParser = GGLParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2dsUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMkJBQTZCO0FBQzdCLHNDQUF3QztBQUV4Qyx5Q0FBOEM7QUFFOUMsdUNBQTRFO0FBRTVFO0lBd0JJLG1CQUFZLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxRQUFlO1FBVHZELGNBQVMsR0FBdUIsRUFBRSxDQUFDO1FBRW5DLGNBQVMsR0FBdUIsRUFBRSxDQUFDO1FBRW5DLGFBQVEsR0FBZSxFQUFFLENBQUM7UUFDMUIsWUFBTyxHQUFvQixFQUFFLENBQUM7UUFLbEMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQTVCYSxjQUFJLEdBQWxCO1FBQ0ksRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFDdkYsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3RFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBUUQsc0JBQWtCLHVCQUFVO2FBQTVCLGNBQWlDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFD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