"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const vscode = require("vscode-languageserver");
const vscode_languageserver_1 = require("vscode-languageserver");
const functions_1 = require("./functions");
const gglDocument_1 = require("./gglDocument");
const gglToken_1 = require("./gglToken");
const connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
const documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
connection.onInitialize((params) => {
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true,
            },
            signatureHelpProvider: {
                triggerCharacters: [`.`]
            },
            definitionProvider: true,
        },
    };
});
connection.onCompletion((documentAndPosition) => {
    const builtinCompletionInfos = GGLProjectLanguageSupport.Instance.provideBuiltinCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    const gglCompletionInfos = GGLProjectLanguageSupport.Instance.provideCompletions(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    const completionItems = [];
    let toAdd;
    builtinCompletionInfos.forEach((element) => {
        if (element.usages.length !== 0) {
            element.usages.forEach((usage) => {
                toAdd = this.createEnty(element, usage, documentAndPosition.position);
                completionItems.push(toAdd);
            });
        }
        else {
            toAdd = this.createEnty(element, undefined, documentAndPosition.position);
            completionItems.push(toAdd);
        }
    });
    gglCompletionInfos.forEach((completionInfo) => { completionItems.push({ label: completionInfo.token.Content, kind: completionInfo.type }); });
    return completionItems;
});
connection.onDefinition((documentAndPosition) => {
    let definitionInfo = GGLProjectLanguageSupport.Instance.provideDefinition(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof definitionInfo === typeof undefined) {
        return undefined;
    }
    else {
        definitionInfo = definitionInfo;
        const startPos = { line: definitionInfo.line, character: definitionInfo.startPos };
        const endPos = { line: definitionInfo.line, character: definitionInfo.endPos };
        const location = { range: { start: startPos, end: endPos }, uri: definitionInfo.file };
        return location;
    }
});
connection.onSignatureHelp((documentAndPosition) => {
    let signatureInfos = GGLProjectLanguageSupport.Instance.provideSignatureInformations(documents.get(documentAndPosition.textDocument.uri), documentAndPosition.position);
    if (typeof signatureInfos === typeof undefined) {
        return undefined;
    }
    else {
        signatureInfos = signatureInfos;
        let signatureHelpItem;
        const signatureHelpItems = [];
        let signatures = { signatures: [], activeParameter: 0, activeSignature: null };
        if (signatureInfos.length === 0) {
            return signatures;
        }
        signatureInfos.forEach((signatureInfo) => {
            signatureInfo.usages.forEach((usage) => {
                const theParameters = [];
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
});
class GGLProjectLanguageSupport {
    constructor() {
        GGLProjectLanguageSupport.activeDoc = gglDocument_1.GGLDocument.createFromTextDoc(documents.all()[0]);
        GGLProjectLanguageSupport.documents.push(GGLProjectLanguageSupport.activeDoc);
        const importFiles = GGLProjectLanguageSupport.activeDoc.updateFile();
        const filePath = documents.all()[0].uri.toString();
        const pathArray = filePath.split(/[\\\/]/);
        const file = pathArray[pathArray.length - 1].split(".")[0];
        this.root = pathArray[pathArray.length - 3] + "/" + pathArray[pathArray.length - 2];
        this.gameRootPath = pathArray.slice(0, pathArray.length - 3).join("/");
        functions_1.logDebug(`gameRootPath: ${this.gameRootPath}`);
        fs.readFile("../../doc/allDocs_doc.json", "utf-8", (errno, fileContent) => {
            if (errno !== null) {
                functions_1.logError("error on file read: " + errno.message);
                return;
            }
            const docs = JSON.parse(fileContent);
            if (GGLProjectLanguageSupport.docus === undefined) {
                GGLProjectLanguageSupport.docus = docs;
            }
            else {
                GGLProjectLanguageSupport.docus.push(docs);
            }
        });
        const mainPath = this.gameRootPath + "/" + this.root + "/" + "main.ggl";
        if (file !== "main" && fs.existsSync(mainPath)) {
            let createdDoc = gglDocument_1.GGLDocument.createFromPair({ rootName: "~", fileName: "main" }, this.gameRootPath, this.root);
            if (typeof createdDoc === typeof undefined) {
                const errStr = `could not open main project file: ${mainPath}`;
                functions_1.logError(errStr);
                throw new Error(errStr);
            }
            createdDoc = createdDoc;
            GGLProjectLanguageSupport.documents.push(createdDoc);
            const importFilesI = createdDoc.updateFile();
            if (typeof importFilesI !== typeof undefined) {
                this.addImports(importFilesI, file);
            }
        }
        else {
            functions_1.logDebug(`no main.ggl in ${this.root} -> no Project?`);
        }
        if (typeof importFiles !== typeof undefined) {
            importFiles.forEach((importPair) => this.addDocument(importPair, this.gameRootPath, this.root));
        }
    }
    provideCompletions(sourceDocument, sourcePosition) {
        let matchingDef = [];
        GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
            functions_1.logInfo(`search completions in ${searchDocument.Root}@${searchDocument.File}`);
            matchingDef = matchingDef.concat(searchDocument.Parser.VariableDefinitions.filter((canidate) => this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition)));
            matchingDef = matchingDef.concat(searchDocument.Parser.FunctionDefinitions.filter((canidate) => this.findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition)));
        });
        const completions = [];
        matchingDef.forEach((element) => {
            let kind;
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
            const completionInfo = {
                token: element,
                type: kind,
            };
            completions.push(completionInfo);
        });
        return completions;
    }
    provideBuiltinCompletions(document, position) {
        const content = this.getSearchContent(document, position);
        if (typeof content === typeof undefined) {
            return [];
        }
        ;
        const prevChar = document.getText({ start: { line: position.line, character: position.character - 1 }, end: { line: position.line, character: position.character } });
        const matchingDef = [];
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
        const completions = [];
        matchingDef.forEach((element) => {
            const kind = vscode.CompletionItemKind.Method;
            const completionInfo = {
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
    provideDefinition(sourceDocument, sourcePosition) {
        let matchingDef;
        GGLProjectLanguageSupport.documents.forEach((gglDocument) => {
            let matchingDocDef = gglDocument.Parser.VariableDefinitions.find((element) => this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition));
            if (matchingDocDef === undefined) {
                matchingDocDef = gglDocument.Parser.FunctionDefinitions.find((element) => this.findMatichingElement(element, gglDocument, sourceDocument, sourcePosition));
            }
            if (matchingDocDef !== undefined) {
                matchingDef = matchingDocDef;
            }
        });
        if (typeof matchingDef !== typeof undefined) {
            matchingDef = matchingDef;
            const defInfo = {
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
    }
    provideSignatureInformations(document, position) {
        try {
            return this.provideGGLSignatures(document, position).concat(this.provideBuiltinSignatureInformations(document, position));
        }
        catch (error) {
            functions_1.logError(`error on creating SignatureInformation[]: ${error.message}`);
        }
    }
    rangeForLineUntilChar(srcPosition) { return { start: { line: srcPosition.line, character: srcPosition.character - 1 }, end: { line: srcPosition.line, character: srcPosition.character } }; }
    provideGGLSignatures(sourceDocument, sourcePosition) {
        try {
            const lineContent = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));
            const selectedFunction = this.searchCurrentFunction(lineContent);
            const matchingDef = [];
            GGLProjectLanguageSupport.documents.forEach((searchDocument) => {
                functions_1.logInfo(`search Signatures in ${searchDocument.Root}@${searchDocument.File}`);
                searchDocument.Parser.FunctionDefinitions.forEach((element) => {
                    if (element.Content === selectedFunction) {
                        matchingDef.push({
                            parameters: element.Parameters,
                            token: element,
                        });
                    }
                });
            });
            const signatures = [];
            matchingDef.forEach((element) => {
                const paramsArray = [];
                const paramNames = [];
                element.parameters.forEach((parameter) => {
                    if (parameter.DefaultValue !== undefined) {
                        paramsArray.push({ name: "var", description: parameter.Content + "=" + parameter.DefaultValue });
                    }
                    else {
                        paramsArray.push({ name: "var", description: parameter.Content });
                    }
                    paramNames.push(`var ${parameter.Content}`);
                });
                const completionInfo = {
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
        }
        catch (error) {
            functions_1.logError(`error on creating GGLSignatureInformation[]: ${error.message}`);
            const signatures = [];
            return signatures;
        }
    }
    provideBuiltinSignatureInformations(sourceDocument, sourcePosition) {
        try {
            const lineContent = sourceDocument.getText(this.rangeForLineUntilChar(sourcePosition));
            const selectedFunction = this.searchCurrentFunction(lineContent);
            const matchingDef = [];
            GGLProjectLanguageSupport.docus.forEach((docFunc) => {
                if (docFunc.name === selectedFunction) {
                    matchingDef.push(docFunc);
                    return;
                }
            });
            const signatures = [];
            matchingDef.forEach((element) => {
                const completionInfo = {
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
        }
        catch (error) {
            functions_1.logError(`error on creating BuiltinSignatureInformation[]: ${error.message}`);
            const signatures = [];
            return signatures;
        }
    }
    searchCurrentFunction(content, functionTree = []) {
        const posOpening = content.indexOf("(");
        const posClosing = content.indexOf(")");
        if ((posClosing < posOpening || posOpening < 0) && posClosing >= 0) {
            functionTree.pop();
            let remainingContent = content.split(")");
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(")"), functionTree);
        }
        else if (posClosing < 0 && posOpening < 0) {
            return functionTree.pop();
        }
        else {
            let selectedFunction = /(\w+)\s*\(/.exec(content);
            if (typeof selectedFunction === typeof null) {
                throw new Error("could not extract function");
            }
            selectedFunction = selectedFunction;
            functionTree.push(selectedFunction[1]);
            let remainingContent = content.split(selectedFunction[0]);
            remainingContent = remainingContent.slice(1);
            return this.searchCurrentFunction(remainingContent.join(selectedFunction[0]), functionTree);
        }
    }
    getActiveParameter(text, position, functionName) {
        let substring = text.substr(0, position);
        substring = substring.split(functionName).pop();
        substring = substring.split("(").slice(1).join("(");
        substring = substring.split(/\w*\([\w ,\(\=\)\[\]]*\)/).join("");
        const substrings = substring.split(",");
        if (substrings === null) {
            return 0;
        }
        else {
            return substrings.length - 1;
        }
    }
    static get Instance() {
        return GGLProjectLanguageSupport.instance || (GGLProjectLanguageSupport.instance = new this());
    }
    addImports(importFilesI, file) {
        const mainImportFiles = [];
        importFilesI.forEach((importFile) => {
            if (importFile.rootName !== "~") {
                mainImportFiles.push(importFile);
            }
            else if (importFile.fileName === file) {
                functions_1.logDebug(`file is direct include`);
            }
            else {
                functions_1.logDebug(`include file: ${this.root}@${importFile.fileName}`);
                mainImportFiles.push(importFile);
            }
        });
        mainImportFiles.forEach((pair) => this.addDocument(pair, this.gameRootPath, this.root));
    }
    addDocument(importFileLocation, rootPath, subRoot) {
        const doc = GGLProjectLanguageSupport.documents.find((document) => document.Root === importFileLocation.rootName && document.File === importFileLocation.fileName);
        if (doc !== undefined) {
            return;
        }
        let newDoc = gglDocument_1.GGLDocument.createFromPair(importFileLocation, rootPath, subRoot);
        if (typeof newDoc !== typeof undefined) {
            newDoc = newDoc;
            GGLProjectLanguageSupport.documents.push(newDoc);
            functions_1.logInfo(`document: ${newDoc.Root}@${newDoc.File} added`);
        }
    }
    getSearchContent(document, position) {
        const lineContent = document.getText(this.rangeForLineUntilChar(position));
        const content = /\w+/g.exec(lineContent);
        if (typeof content === typeof null) {
            return undefined;
        }
        else {
            return content.pop();
        }
    }
    findMatichingElement(canidate, searchDocument, sourceDocument, sourcePosition) {
        try {
            if (canidate.NestedGroups.length !== 1 && canidate.FileName !== `${searchDocument.Root}@${searchDocument.File}`) {
                return false;
            }
            let content = this.getSearchContent(sourceDocument, sourcePosition);
            if (typeof content === typeof undefined) {
                throw new Error("could not find search content");
            }
            else {
                content = content;
                if (canidate.NestedGroups.length === 1) {
                    if (canidate.Type !== gglToken_1.TokenTypes.FunctionDeclatation && canidate.Type !== gglToken_1.TokenTypes.VariableDeclaration) {
                        return false;
                    }
                    const isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }
                const groups = [];
                groups.push(0);
                searchDocument.Parser.Sections.forEach((section) => {
                    if (sourcePosition.line >= section.beginAtLine && sourcePosition.line <= section.endAtLine) {
                        groups.push(section.groupID);
                    }
                });
                canidate.NestedGroups.sort();
                const sharedGroup = groups.indexOf(canidate.NestedGroups[canidate.NestedGroups.length - 1]) < 0 ? false : true;
                if (sharedGroup) {
                    if (canidate.Type !== gglToken_1.TokenTypes.FunctionDeclatation && canidate.Type !== gglToken_1.TokenTypes.VariableDeclaration) {
                        return false;
                    }
                    const isFound = canidate.Content.indexOf(content) >= 0;
                    return isFound;
                }
                return false;
            }
        }
        catch (errObj) {
            if (typeof errObj === typeof Error) {
                const err = errObj;
                functions_1.logError(`findMatchingElement threw exception: ${err.name}, ${err.message}`);
                if (typeof err.stack !== typeof undefined) {
                    functions_1.logError(`callstack:\n ${err.stack}`);
                }
                else {
                    functions_1.logError(`no stack`);
                }
            }
            return false;
        }
    }
}
GGLProjectLanguageSupport.documents = [];
connection.listen();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUHJvamVjdExhbmd1YWdlU3VwcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdnbFByb2plY3RMYW5ndWFnZVN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOztBQUliLHlCQUF5QjtBQUN6QixnREFBK0M7QUFFL0MsaUVBRzhCO0FBRzlCLDJDQUEwRDtBQUMxRCwrQ0FBNEM7QUFHNUMseUNBQTBEO0FBTTFELE1BQU0sVUFBVSxHQUFnQix3Q0FBZ0IsQ0FBQyxJQUFJLHdDQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksd0NBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUkvRyxNQUFNLFNBQVMsR0FBa0IsSUFBSSxxQ0FBYSxFQUFFLENBQUM7QUFHckQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUk3QixVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBeUIsRUFBb0IsRUFBRTtJQUNwRSxNQUFNLENBQUM7UUFDSCxZQUFZLEVBQUU7WUFFVixnQkFBZ0IsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUVwQyxrQkFBa0IsRUFBRTtnQkFDaEIsZUFBZSxFQUFFLElBQUk7YUFDeEI7WUFDRCxxQkFBcUIsRUFBRTtnQkFDbkIsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDM0I7WUFDRCxrQkFBa0IsRUFBRSxJQUFJO1NBQzNCO0tBQ0osQ0FBQTtBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLG1CQUErQyxFQUFvQixFQUFFO0lBQzFGLE1BQU0sc0JBQXNCLEdBQXVDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuTixNQUFNLGtCQUFrQixHQUFnQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDak0sTUFBTSxlQUFlLEdBQXFCLEVBQUUsQ0FBQztJQUM3QyxJQUFJLEtBQXFCLENBQUM7SUFDMUIsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBeUMsRUFBRSxFQUFFO1FBRXpFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUE2QyxFQUFFLEVBQUU7Z0JBQ3JFLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBeUMsRUFBRSxFQUFFLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4SyxNQUFNLENBQUMsZUFBZSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDO0FBb0JILFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxtQkFBK0MsRUFBK0IsRUFBRTtJQUNyRyxJQUFJLGNBQWMsR0FBMEMseUJBQXlCLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BNLEVBQUUsQ0FBQyxDQUFDLE9BQU8sY0FBYyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztRQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7SUFBQyxDQUFDO0lBQ3JFLElBQUksQ0FBQyxDQUFDO1FBQ0YsY0FBYyxHQUFHLGNBQTJDLENBQUM7UUFTN0QsTUFBTSxRQUFRLEdBQW9CLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwRyxNQUFNLE1BQU0sR0FBb0IsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hHLE1BQU0sUUFBUSxHQUFvQixFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdkcsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUNwQixDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUE7QUFFRixVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsbUJBQStDLEVBQW9DLEVBQUU7SUFDN0csSUFBSSxjQUFjLEdBQTJDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoTixFQUFFLENBQUMsQ0FBQyxPQUFPLGNBQWMsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFBQyxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQUMsQ0FBQztJQUNyRSxJQUFJLENBQUMsQ0FBQztRQUNGLGNBQWMsR0FBRyxjQUE0QyxDQUFDO1FBQzlELElBQUksaUJBQThDLENBQUM7UUFDbkQsTUFBTSxrQkFBa0IsR0FBa0MsRUFBRSxDQUFDO1FBQzdELElBQUksVUFBVSxHQUF5QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDckcsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUFDLENBQUM7UUFFdkQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ3JDLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ25DLE1BQU0sYUFBYSxHQUFrQyxFQUFFLENBQUM7Z0JBQ3hELGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7b0JBQ3ZDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQ3hGLENBQUMsQ0FBQyxDQUFDO2dCQUNILGlCQUFpQixHQUFHLEVBQUUsS0FBSyxFQUFFLGFBQWEsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxDQUFDO2dCQUNySSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMvQyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO1FBQ0gsVUFBVSxHQUFHLEVBQUUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztRQUN4SCxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3RCLENBQUM7QUFDTCxDQUFDLENBQ0EsQ0FBQztBQWNGO0lBV0k7UUFDSSx5QkFBeUIsQ0FBQyxTQUFTLEdBQUcseUJBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4Rix5QkFBeUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNyRSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25ELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkUsb0JBQVEsQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFHL0MsRUFBRSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDdEUsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLG9CQUFRLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUM7WUFDWCxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyQyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDaEQseUJBQXlCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUMzQyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7UUFJSCxNQUFNLFFBQVEsR0FBVyxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxVQUFVLENBQUM7UUFDaEYsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLFVBQVUsR0FBNEIseUJBQVcsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2SSxFQUFFLENBQUMsQ0FBQyxPQUFPLFVBQVUsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFBLENBQUM7Z0JBQ3hDLE1BQU0sTUFBTSxHQUFHLHFDQUFxQyxRQUFRLEVBQUUsQ0FBQztnQkFDL0Qsb0JBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDakIsTUFBTSxJQUFJLEtBQUssQ0FBRSxNQUFNLENBQUMsQ0FBQztZQUM3QixDQUFDO1lBQ0QsVUFBVSxHQUFHLFVBQXlCLENBQUM7WUFDdkMseUJBQXlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNyRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0MsRUFBRSxDQUFDLENBQUMsT0FBTyxZQUFZLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQStCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0QsQ0FBQztRQUVMLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLG9CQUFRLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sV0FBVyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUEsQ0FBQztZQUN4QyxXQUErQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN6SCxDQUFDO0lBQ0wsQ0FBQztJQUVNLGtCQUFrQixDQUFDLGNBQW1DLEVBQUUsY0FBK0I7UUFJMUYsSUFBSSxXQUFXLEdBQXVCLEVBQUUsQ0FBQztRQUN6Qyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDM0QsbUJBQU8sQ0FBQyx5QkFBeUIsY0FBYyxDQUFDLElBQUksSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUvRSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0TCxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxTCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sV0FBVyxHQUFnQyxFQUFFLENBQUM7UUFDcEQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzVCLElBQUksSUFBK0IsQ0FBQztZQUNwQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkIsS0FBSyxxQkFBVSxDQUFDLG1CQUFtQjtvQkFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7b0JBQzFDLEtBQUssQ0FBQztnQkFDVixLQUFLLHFCQUFVLENBQUMsbUJBQW1CO29CQUMvQixJQUFJLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztvQkFDMUMsS0FBSyxDQUFDO2dCQUNWO29CQUNJLElBQUksR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQy9DLENBQUM7WUFDRCxNQUFNLGNBQWMsR0FBRztnQkFDbkIsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsSUFBSSxFQUFFLElBQUk7YUFDYixDQUFDO1lBQ0YsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUM7SUFFdkIsQ0FBQztJQUVNLHlCQUF5QixDQUFDLFFBQTZCLEVBQUUsUUFBeUI7UUFJckYsTUFBTSxPQUFPLEdBQXVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUUsRUFBRSxDQUFDLENBQUMsT0FBTyxPQUFPLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUFDLENBQUM7UUFBQSxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFXLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU5SyxNQUFNLFdBQVcsR0FBZSxFQUFFLENBQUM7UUFDbkMseUJBQXlCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2hELEVBQUUsQ0FBQyxDQUFDLFFBQVEsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUM7WUFDWCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxDQUFDO1lBQ1gsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQXVDLEVBQUUsQ0FBQztRQUMzRCxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEdBQThCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7WUFDekUsTUFBTSxjQUFjLEdBQXFDO2dCQUNyRCxPQUFPLEVBQUUsT0FBTyxDQUFDLFdBQVc7Z0JBQzVCLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbkIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUN0QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7Z0JBQ2hDLElBQUksRUFBRSxJQUFJO2dCQUNWLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTthQUN6QixDQUFDO1lBQ0YsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUM7SUFFdkIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLGNBQW1DLEVBQUUsY0FBK0I7UUFTekYsSUFBSSxXQUF5QyxDQUFDO1FBQzlDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUV4RCxJQUFJLGNBQWMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFFL0osRUFBRSxDQUFDLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQUMsY0FBYyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUM7WUFDak0sRUFBRSxDQUFDLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLFdBQVcsR0FBRyxjQUFjLENBQUM7WUFDakMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLENBQUMsT0FBTyxXQUFXLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQzFDLFdBQVcsR0FBRyxXQUErQixDQUFDO1lBQzlDLE1BQU0sT0FBTyxHQUFHO2dCQUNaLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTTtnQkFDMUIsSUFBSSxFQUFFLFdBQVcsQ0FBQyxRQUFRO2dCQUMxQixJQUFJLEVBQUUsV0FBVyxDQUFDLFVBQVU7Z0JBQzVCLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUTthQUNqQyxDQUFDO1lBQ0YsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNuQixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ3JCLENBQUM7SUFFTCxDQUFDO0lBRU0sNEJBQTRCLENBQUMsUUFBNkIsRUFBRSxRQUF5QjtRQUN4RixJQUFJLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzlILENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2Isb0JBQVEsQ0FBQyw2Q0FBNkMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDM0UsQ0FBQztJQUNMLENBQUM7SUF3Qk8scUJBQXFCLENBQUMsV0FBNEIsSUFBa0IsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQVE1TixvQkFBb0IsQ0FBQyxjQUFtQyxFQUFFLGNBQStCO1FBRTdGLElBQUksQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFFdkYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFakUsTUFBTSxXQUFXLEdBQXVFLEVBQUUsQ0FBQztZQUMzRix5QkFBeUIsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7Z0JBQzNELG1CQUFPLENBQUMsd0JBQXdCLGNBQWMsQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBRTlFLGNBQWMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQzFELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxXQUFXLENBQUMsSUFBSSxDQUFDOzRCQUNiLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTs0QkFDOUIsS0FBSyxFQUFFLE9BQU87eUJBQ2pCLENBQUMsQ0FBQztvQkFDUCxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFVBQVUsR0FBK0IsRUFBRSxDQUFDO1lBQ2xELFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFhNUIsTUFBTSxXQUFXLEdBQWlELEVBQUUsQ0FBQztnQkFDckUsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO29CQUNyQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztvQkFDckcsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ3RFLENBQUM7b0JBQ0QsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRCxDQUFDLENBQUMsQ0FBQztnQkFDSCxNQUFNLGNBQWMsR0FBNkI7b0JBQzdDLGVBQWUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7b0JBQ3RHLE9BQU8sRUFBRSxZQUFZLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUc7b0JBQ3RFLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU87b0JBQzVCLE1BQU0sRUFBRSxXQUFXO29CQUNuQixXQUFXLEVBQUUsdUNBQXVDO29CQUNwRCxNQUFNLEVBQUUsQ0FBQzs0QkFDTCxJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFOzRCQUNoQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPO3lCQUN0QyxDQUFDO2lCQUNMLENBQUM7Z0JBQ0YsVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwQyxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDdEIsQ0FBQztRQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDYixvQkFBUSxDQUFDLGdEQUFnRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMxRSxNQUFNLFVBQVUsR0FBK0IsRUFBRSxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDdEIsQ0FBQztJQUVMLENBQUM7SUFHTyxtQ0FBbUMsQ0FBQyxjQUFtQyxFQUFFLGNBQStCO1FBQzVHLElBQUksQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFFdkYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFakUsTUFBTSxXQUFXLEdBQWUsRUFBRSxDQUFDO1lBQ25DLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDaEQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzFCLE1BQU0sQ0FBQztnQkFDWCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFVBQVUsR0FBK0IsRUFBRSxDQUFDO1lBQ2xELFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFFNUIsTUFBTSxjQUFjLEdBQTZCO29CQUM3QyxlQUFlLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQzdGLE9BQU8sRUFBRSxPQUFPLENBQUMsV0FBVztvQkFDNUIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNuQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07b0JBQ3RCLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztvQkFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2lCQUN6QixDQUFDO2dCQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3RCLENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2Isb0JBQVEsQ0FBQyxvREFBb0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDOUUsTUFBTSxVQUFVLEdBQStCLEVBQUUsQ0FBQztZQUNsRCxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3RCLENBQUM7SUFDTCxDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZSxFQUFFLGVBQXlCLEVBQUU7UUFDdEUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLElBQUksVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakUsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksZ0JBQWdCLEdBQWEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwRCxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDOUIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxnQkFBZ0IsR0FBMkIsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxRSxFQUFFLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFDRCxnQkFBZ0IsR0FBRyxnQkFBbUMsQ0FBQztZQUN2RCxZQUFZLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxnQkFBZ0IsR0FBYSxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEUsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEcsQ0FBQztJQUNMLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxZQUFvQjtRQUMzRSxJQUFJLFNBQVMsR0FBdUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0QsU0FBUyxHQUFJLFNBQW9CLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVELFNBQVMsR0FBSSxTQUFvQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hFLFNBQVMsR0FBSSxTQUFvQixDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RSxNQUFNLFVBQVUsR0FBSSxTQUFvQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxFQUFFLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7SUFDTCxDQUFDO0lBRU0sTUFBTSxLQUFLLFFBQVE7UUFDdEIsTUFBTSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkcsQ0FBQztJQUVPLFVBQVUsQ0FBQyxZQUE2QixFQUFFLElBQVk7UUFDMUQsTUFBTSxlQUFlLEdBQW9CLEVBQUUsQ0FBQztRQUM1QyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDaEMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3JDLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxvQkFBUSxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDdkMsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLG9CQUFRLENBQUMsaUJBQWlCLElBQUksQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQzlELGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRU8sV0FBVyxDQUFDLGtCQUFpQyxFQUFFLFFBQWdCLEVBQUUsT0FBZTtRQUNwRixNQUFNLEdBQUcsR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBcUIsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxrQkFBa0IsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoTCxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNwQixNQUFNLENBQUM7UUFDWCxDQUFDO1FBQ0QsSUFBSSxNQUFNLEdBQTJCLHlCQUFXLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN0RyxFQUFFLENBQUMsQ0FBQyxPQUFPLE1BQU0sS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFBLENBQUM7WUFDcEMsTUFBTSxHQUFHLE1BQXFCLENBQUM7WUFDL0IseUJBQXlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxtQkFBTyxDQUFDLGFBQWEsTUFBTSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFFBQTZCLEVBQUUsUUFBeUI7UUFDN0UsTUFBTSxXQUFXLEdBQVcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLE9BQU8sR0FBMkIsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqRSxFQUFFLENBQUMsQ0FBQyxPQUFPLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsU0FBUyxDQUFBO1FBQUMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFFLE9BQTJCLENBQUMsR0FBRyxFQUFFLENBQUE7UUFBQyxDQUFDO0lBQy9HLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUEwQixFQUFFLGNBQTJCLEVBQUUsY0FBbUMsRUFBRSxjQUErQjtRQUN0SixJQUFJLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsS0FBSyxHQUFHLGNBQWMsQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQUMsQ0FBQztZQUVsSSxJQUFJLE9BQU8sR0FBdUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUV4RixFQUFFLENBQUMsQ0FBQyxPQUFPLE9BQU8sS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osT0FBTyxHQUFHLE9BQWlCLENBQUM7Z0JBRTVCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3JDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUsscUJBQVUsQ0FBQyxtQkFBbUIsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLHFCQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO3dCQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQUMsQ0FBQztvQkFDM0gsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN2RCxNQUFNLENBQUMsT0FBTyxDQUFDO2dCQUNuQixDQUFDO2dCQUdELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDZixjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtvQkFDL0MsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLGNBQWMsQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7d0JBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQUMsQ0FBQztnQkFDakksQ0FBQyxDQUFDLENBQUM7Z0JBR0gsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDL0csRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFFZCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLHFCQUFVLENBQUMsbUJBQW1CLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxxQkFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQzt3QkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUFDLENBQUM7b0JBQzNILE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdkQsTUFBTSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxNQUFNLENBQUMsS0FBSyxDQUFDO1lBRWpCLENBQUM7UUFDTCxDQUFDO1FBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNkLEVBQUUsQ0FBQyxDQUFDLE9BQU8sTUFBTSxLQUFLLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTSxHQUFHLEdBQVUsTUFBZSxDQUFDO2dCQUNuQyxvQkFBUSxDQUFDLHdDQUF3QyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RSxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUFDLG9CQUFRLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUFDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQUMsb0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFBQyxDQUFDO1lBQ3ZILENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDTCxDQUFDOztBQTdhYyxtQ0FBUyxHQUFrQixFQUFFLENBQUM7QUFrYmpELFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyJ9