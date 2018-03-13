"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var vscode = require("vscode-languageserver");
var vscode_languageserver_1 = require("vscode-languageserver");
var functions_1 = require("./functions");
var gglDocument_1 = require("./gglDocument");
var gglToken_1 = require("./gglToken");
var connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
var documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
connection.onInitialize(function (params) {
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
            },
            signatureHelpProvider: {
                triggerCharacters: ["."]
            },
            definitionProvider: true,
        },
    };
});
connection.onCompletion(function (documentAndPosition) {
    var builtinCompletionInfos = GGLProjectLanguageSupport.Instance.provideBuiltinCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    var gglCompletionInfos = GGLProjectLanguageSupport.Instance.provideCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    var completionItems = [];
    var toAdd;
    builtinCompletionInfos.forEach(function (element) {
        if (element.usages.length !== 0) {
            element.usages.forEach(function (usage) {
                toAdd = _this.createEnty(element, usage, documentAndPosition.position);
                completionItems.push(toAdd);
            });
        }
        else {
            toAdd = _this.createEnty(element, undefined, documentAndPosition.position);
            completionItems.push(toAdd);
        }
    });
    gglCompletionInfos.forEach(function (completionInfo) { completionItems.push({ label: completionInfo.token.Content, kind: completionInfo.type }); });
    return completionItems;
});
connection.onDefinition(function (documentAndPosition) {
    var definitionInfo = GGLProjectLanguageSupport.Instance.provideDefinition(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof definitionInfo === typeof undefined) {
        return undefined;
    }
    else {
        definitionInfo = definitionInfo;
        var startPos = { line: definitionInfo.line, character: definitionInfo.startPos };
        var endPos = { line: definitionInfo.line, character: definitionInfo.endPos };
        var location = { range: { start: startPos, end: endPos }, uri: definitionInfo.file };
        return location;
    }
});
connection.onSignatureHelp(function (documentAndPosition) {
    var signatureInfos = GGLProjectLanguageSupport.Instance.provideSignatureInformations(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof signatureInfos === typeof undefined) {
        return undefined;
    }
    else {
        signatureInfos = signatureInfos;
        var signatureHelpItem_1;
        var signatureHelpItems_1 = [];
        var signatures = { signatures: [], activeParameter: 0, activeSignature: null };
        if (signatureInfos.length === 0) {
            return signatures;
        }
        signatureInfos.forEach(function (signatureInfo) {
            signatureInfo.usages.forEach(function (usage) {
                var theParameters = [];
                signatureInfo.params.forEach(function (parameter) {
                    theParameters.push({ label: parameter.name, documentation: parameter.description });
                });
                signatureHelpItem_1 = { label: signatureInfo.label, documentation: usage.functionName + "(" + usage.call + ")", parameters: theParameters };
                signatureHelpItems_1.push(signatureHelpItem_1);
            });
        });
        signatures = { activeParameter: signatureInfos[0].activeParameter, activeSignature: 0, signatures: signatureHelpItems_1 };
        return signatures;
    }
});
var GGLProjectLanguageSupport = (function () {
    function GGLProjectLanguageSupport() {
        var _this = this;
        GGLProjectLanguageSupport.activeDoc = gglDocument_1.GGLDocument.createFromTextDoc(documents.all()[0]);
        GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
        var importFiles = GGLProjectLanguageSupport.activeDoc.updateFile();
        var filePath = documents.all()[0].uri.toString();
        var pathArray = filePath.split(/[\\\/]/);
        var file = pathArray[pathArray.length - 1].split(".")[0];
        this.root = pathArray[pathArray.length - 3] + "/" + pathArray[pathArray.length - 2];
        this.gameRootPath = pathArray.slice(0, pathArray.length - 3).join("/");
        functions_1.logDebug("gameRootPath: " + this.gameRootPath);
        fs.readFile("../../doc/allDocs_doc.json", "utf-8", function (errno, fileContent) {
            if (errno !== null) {
                functions_1.logError("error on file read: " + errno.message);
                return;
            }
            var docs = JSON.parse(fileContent);
            if (GGLProjectLanguageSupport.docus === undefined) {
                GGLProjectLanguageSupport.docus = docs;
            }
            else {
                GGLProjectLanguageSupport.docus.push(docs);
            }
        });
        var mainPath = this.gameRootPath + "/" + this.root + "/" + "main.ggl";
        if (file !== "main" && fs.existsSync(mainPath)) {
            var createdDoc = gglDocument_1.GGLDocument.createFromPair({ rootName: "~", fileName: "main" }, this.gameRootPath, this.root);
            if (typeof createdDoc === typeof undefined) {
                var errStr = "could not open main project file: " + mainPath;
                functions_1.logError(errStr);
                throw new Error(errStr);
            }
            createdDoc = createdDoc;
            GGLProjectLanguageSupport.documents.push(createdDoc);
            var importFilesI = createdDoc.updateFile();
            if (typeof importFilesI !== typeof undefined) {
                this.addImports(importFilesI, file);
            }
        }
        else {
            functions_1.logDebug("no main.ggl in " + this.root + " -> no Project?");
        }
        if (typeof importFiles !== typeof undefined) {
            importFiles.forEach(function (importPair) { return _this.addDocument(importPair, _this.gameRootPath, _this.root); });
        }
    }
    GGLProjectLanguageSupport.prototype.provideCompletions = function (sourceDocument, sourcePosition) {
        var _this = this;
        var matchingDef = [];
        GGLProjectLanguageSupport.documents.forEach(function (searchDocument) {
            functions_1.logInfo("search completions in " + searchDocument.Root + "@" + searchDocument.File);
            matchingDef = matchingDef.concat(searchDocument.Parser.VariableDefinitions.filter(function (canidate) { return _this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition); }));
            matchingDef = matchingDef.concat(searchDocument.Parser.FunctionDefinitions.filter(function (canidate) { return _this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition); }));
        });
        var completions = [];
        matchingDef.forEach(function (element) {
            var kind;
            switch (element.Type) {
                case gglToken_1.TokenTypes.FunctionDeclatation:
                    kind = vscode.CompletionItemKind.Function;
                    break;
                case gglToken_1.TokenTypes.VariableDeclaration:
                    kind = vscode.CompletionItemKind.Variable;
                    break;
                default:
                    kind = vscode.CompletionItemKind.Field;
            }
            var completionInfo = {
                token: element,
                type: kind,
            };
            completions.push(completionInfo);
        });
        return completions;
    };
    GGLProjectLanguageSupport.prototype.provideBuiltinCompletions = function (document, position) {
        var content = this.getSearchContent(document, position);
        if (typeof content === typeof undefined) {
            return [];
        }
        ;
        var prevChar = document.getText({ start: { line: position.line, character: position.character - 1 }, end: { line: position.line, character: position.character } });
        var matchingDef = [];
        GGLProjectLanguageSupport.docus.forEach(function (docFunc) {
            if (prevChar === ".") {
                matchingDef.push(docFunc);
                return;
            }
            if (docFunc.name.match(content)) {
                matchingDef.push(docFunc);
                return;
            }
        });
        var completions = [];
        matchingDef.forEach(function (element) {
            var kind = vscode.CompletionItemKind.Method;
            var completionInfo = {
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
    };
    GGLProjectLanguageSupport.prototype.provideDefinition = function (sourceDocument, sourcePosition) {
        var _this = this;
        var matchingDef;
        GGLProjectLanguageSupport.documents.forEach(function (gglDocument) {
            var matchingDocDef = gglDocument.Parser.VariableDefinitions.find(function (element) { return _this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition); });
            if (matchingDocDef === undefined) {
                matchingDocDef = gglDocument.Parser.FunctionDefinitions.find(function (element) { return _this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition); });
            }
            if (matchingDocDef !== undefined) {
                matchingDef = matchingDocDef;
            }
        });
        if (typeof matchingDef !== typeof undefined) {
            matchingDef = matchingDef;
            var defInfo = {
                endPos: matchingDef.EndPos,
                file: matchingDef.FileName,
                line: matchingDef.LineNumber,
                startPos: matchingDef.StartPos,
            };
            return defInfo;
        }
        else {
            return undefined;
        }
    };
    GGLProjectLanguageSupport.prototype.provideSignatureInformations = function (document, position) {
        try {
            return this.provideGGLSignatures(document, position).concat(this.provideBuiltinSignatureInformations(document, position));
        }
        catch (error) {
            functions_1.logError("error on creating SignatureInformation[]: " + error.message);
        }
    };
    GGLProjectLanguageSupport.prototype.rangeForLineUntilChar = function (srcPosition) { return { start: { line: srcPosition.line, character: srcPosition.character - 1 }, end: { line: srcPosition.line, character: srcPosition.character } }; };
    GGLProjectLanguageSupport.prototype.provideGGLSignatures = function (sourceDocument, sourcePosition) {
        var _this = this;
        try {
            var lineContent_1 = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));
            var selectedFunction_1 = this.searchCurrentFunction(lineContent_1);
            var matchingDef_1 = [];
            GGLProjectLanguageSupport.documents.forEach(function (searchDocument) {
                functions_1.logInfo("search Signatures in " + searchDocument.Root + "@" + searchDocument.File);
                searchDocument.Parser.FunctionDefinitions.forEach(function (element) {
                    if (element.Content === selectedFunction_1) {
                        matchingDef_1.push({
                            parameters: element.Parameters,
                            token: element,
                        });
                    }
                });
            });
            var signatures_1 = [];
            matchingDef_1.forEach(function (element) {
                var paramsArray = [];
                var paramNames = [];
                element.parameters.forEach(function (parameter) {
                    if (parameter.DefaultValue !== undefined) {
                        paramsArray.push({ name: "var", description: parameter.Content + "=" + parameter.DefaultValue });
                    }
                    else {
                        paramsArray.push({ name: "var", description: parameter.Content });
                    }
                    paramNames.push("var " + parameter.Content);
                });
                var completionInfo = {
                    activeParameter: _this.getActiveParameter(lineContent_1, sourcePosition.character, element.token.Content),
                    comment: "function " + element.token.Content + "(" + paramNames.join(", ") + ")",
                    label: element.token.Content,
                    params: paramsArray,
                    returnValue: "do GGL-Functions have a return value?",
                    usages: [{
                            call: "" + paramNames.join(", "),
                            functionName: element.token.Content,
                        }],
                };
                signatures_1.push(completionInfo);
            });
            return signatures_1;
        }
        catch (error) {
            functions_1.logError("error on creating GGLSignatureInformation[]: " + error.message);
            var signatures = [];
            return signatures;
        }
    };
    GGLProjectLanguageSupport.prototype.provideBuiltinSignatureInformations = function (sourceDocument, sourcePosition) {
        var _this = this;
        try {
            var lineContent_2 = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));
            var selectedFunction_2 = this.searchCurrentFunction(lineContent_2);
            var matchingDef_2 = [];
            GGLProjectLanguageSupport.docus.forEach(function (docFunc) {
                if (docFunc.name === selectedFunction_2) {
                    matchingDef_2.push(docFunc);
                    return;
                }
            });
            var signatures_2 = [];
            matchingDef_2.forEach(function (element) {
                var completionInfo = {
                    activeParameter: _this.getActiveParameter(lineContent_2, sourcePosition.character, element.name),
                    comment: element.description,
                    label: element.name,
                    params: element.params,
                    returnValue: element.returnValue,
                    usages: element.usages,
                };
                signatures_2.push(completionInfo);
            });
            return signatures_2;
        }
        catch (error) {
            functions_1.logError("error on creating BuiltinSignatureInformation[]: " + error.message);
            var signatures = [];
            return signatures;
        }
    };
    GGLProjectLanguageSupport.prototype.searchCurrentFunction = function (content, functionTree) {
        if (functionTree === void 0) { functionTree = []; }
        var posOpening = content.indexOf("(");
        var posClosing = content.indexOf(")");
        if ((posClosing < posOpening || posOpening < 0) && posClosing >= 0) {
            functionTree.pop();
            var remainingContent = content.split(")");
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(")"), functionTree);
        }
        else if (posClosing < 0 && posOpening < 0) {
            return functionTree.pop();
        }
        else {
            var selectedFunction = /(\w+)\s*\(/.exec(content);
            if (typeof selectedFunction === typeof null) {
                throw new Error("could not extract function");
            }
            selectedFunction = selectedFunction;
            functionTree.push(selectedFunction[1]);
            var remainingContent = content.split(selectedFunction[0]);
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(selectedFunction[0]), functionTree);
        }
    };
    GGLProjectLanguageSupport.prototype.getActiveParameter = function (text, position, functionName) {
        var substring = text.substr(0, position);
        substring = substring.split(functionName).pop();
        substring = substring.split("(").slice(1).join("(");
        substring = substring.split(/\w*\([\w ,\(\=\)\[\]]*\)/).join("");
        var substrings = substring.split(",");
        if (substrings === null) {
            return 0;
        }
        else {
            return substrings.length - 1;
        }
    };
    Object.defineProperty(GGLProjectLanguageSupport, "Instance", {
        get: function () {
            return GGLProjectLanguageSupport.instance || (GGLProjectLanguageSupport.instance = new this());
        },
        enumerable: true,
        configurable: true
    });
    GGLProjectLanguageSupport.prototype.addImports = function (importFilesI, file) {
        var _this = this;
        var mainImportFiles = [];
        importFilesI.forEach(function (importFile) {
            if (importFile.rootName !== "~") {
                mainImportFiles.push(importFile);
            }
            else if (importFile.fileName === file) {
                functions_1.logDebug("file is direct include");
            }
            else {
                functions_1.logDebug("include file: " + _this.root + "@" + importFile.fileName);
                mainImportFiles.push(importFile);
            }
        });
        mainImportFiles.forEach(function (pair) { return _this.addDocument(pair, _this.gameRootPath, _this.root); });
    };
    GGLProjectLanguageSupport.prototype.addDocument = function (importFileLocation, rootPath, subRoot) {
        var doc = GGLProjectLanguageSupport.documents.find(function (document) { return document.Root === importFileLocation.rootName && document.File === importFileLocation.fileName; });
        if (doc !== undefined) {
            return;
        }
        var newDoc = gglDocument_1.GGLDocument.createFromPair(importFileLocation, rootPath, subRoot);
        if (typeof newDoc !== typeof undefined) {
            newDoc = newDoc;
            GGLProjectLanguageSupport.documents.push(newDoc);
            functions_1.logInfo("document: " + newDoc.Root + "@" + newDoc.File + " added");
        }
    };
    GGLProjectLanguageSupport.prototype.getSearchContent = function (document, position) {
        var lineContent = document.getText(this.rangeForLineUntilChar(position));
        var content = /\w+/g.exec(lineContent);
        if (typeof content === typeof null) {
            return undefined;
        }
        else {
            return content.pop();
        }
    };
    GGLProjectLanguageSupport.prototype.findMatichingElement = function (canidate, searchDocument, sourceDocument, sourcePosition) {
        try {
            if (canidate.NestedGroups.length !== 1 && canidate.FileName !== searchDocument.Root + "@" + searchDocument.File) {
                return false;
            }
            var content = this.getSearchContent(sourceDocument, sourcePosition);
            if (typeof content === typeof undefined) {
                throw new Error("could not find search content");
            }
            else {
                content = content;
                if (canidate.NestedGroups.length === 1) {
                    if (canidate.Type !== gglToken_1.TokenTypes.FunctionDeclatation && canidate.Type !== gglToken_1.TokenTypes.VariableDeclaration) {
                        return false;
                    }
                    var isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }
                var groups_1 = [];
                groups_1.push(0);
                searchDocument.Parser.Sections.forEach(function (section) {
                    if (sourcePosition.line >= section.beginAtLine && sourcePosition.line <= section.endAtLine) {
                        groups_1.push(section.groupID);
                    }
                });
                canidate.NestedGroups.sort();
                var sharedGroup = groups_1.indexOf(canidate.NestedGroups[canidate.NestedGroups.length - 1]) < 0 ? false : true;
                if (sharedGroup) {
                    if (canidate.Type !== gglToken_1.TokenTypes.FunctionDeclatation && canidate.Type !== gglToken_1.TokenTypes.VariableDeclaration) {
                        return false;
                    }
                    var isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }
                return false;
            }
        }
        catch (errObj) {
            if (typeof errObj === typeof Error) {
                var err = errObj;
                functions_1.logError("findMatchingElement threw exception: " + err.name + ", " + err.message);
                if (typeof err.stack !== typeof undefined) {
                    functions_1.logError("callstack:\n " + err.stack);
                }
                else {
                    functions_1.logError("no stack");
                }
            }
            return false;
        }
    };
    GGLProjectLanguageSupport.documents = [];
    return GGLProjectLanguageSupport;
}());
connection.listen();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUHJvamVjdExhbmd1YWdlU3VwcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdnbFByb2plY3RMYW5ndWFnZVN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDO0FBQWIsaUJBd2tCb0I7O0FBcGtCcEIsdUJBQXlCO0FBQ3pCLDhDQUErQztBQUUvQywrREFHOEI7QUFHOUIseUNBQTBEO0FBQzFELDZDQUE0QztBQUc1Qyx1Q0FBMEQ7QUFNMUQsSUFBTSxVQUFVLEdBQWdCLHdDQUFnQixDQUFDLElBQUksd0NBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSx3Q0FBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBSS9HLElBQU0sU0FBUyxHQUFrQixJQUFJLHFDQUFhLEVBQUUsQ0FBQztBQUdyRCxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBSTdCLFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBQyxNQUF5QjtJQUM5QyxNQUFNLENBQUM7UUFDSCxZQUFZLEVBQUU7WUFFVixnQkFBZ0IsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUVwQyxrQkFBa0IsRUFBRTtnQkFDaEIsZUFBZSxFQUFFLElBQUk7YUFDeEI7WUFDRCxxQkFBcUIsRUFBRTtnQkFDbkIsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDM0I7WUFDRCxrQkFBa0IsRUFBRSxJQUFJO1NBQzNCO0tBQ0osQ0FBQTtBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFDLG1CQUErQztJQUNwRSxJQUFNLHNCQUFzQixHQUF1Qyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbk4sSUFBTSxrQkFBa0IsR0FBZ0MseUJBQXlC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