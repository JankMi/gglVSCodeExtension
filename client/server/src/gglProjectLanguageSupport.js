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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsUHJvamVjdExhbmd1YWdlU3VwcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NlcnZlci9zcmMvZ2dsUHJvamVjdExhbmd1YWdlU3VwcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7O0FBSWIseUJBQXlCO0FBQ3pCLGdEQUErQztBQUUvQyxpRUFHOEI7QUFHOUIsMkNBQTBEO0FBQzFELCtDQUE0QztBQUc1Qyx5Q0FBMEQ7QUFNMUQsTUFBTSxVQUFVLEdBQWdCLHdDQUFnQixDQUFDLElBQUksd0NBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSx3Q0FBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBSS9HLE1BQU0sU0FBUyxHQUFrQixJQUFJLHFDQUFhLEVBQUUsQ0FBQztBQUdyRCxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBSTdCLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUF5QixFQUFvQixFQUFFO0lBQ3BFLE1BQU0sQ0FBQztRQUNILFlBQVksRUFBRTtZQUVWLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBRXBDLGtCQUFrQixFQUFFO2dCQUNoQixlQUFlLEVBQUUsSUFBSTthQUN4QjtZQUNELHFCQUFxQixFQUFFO2dCQUNuQixpQkFBaUIsRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUMzQjtZQUNELGtCQUFrQixFQUFFLElBQUk7U0FDM0I7S0FDSixDQUFBO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsbUJBQStDLEVBQW9CLEVBQUU7SUFDMUYsTUFBTSxzQkFBc0IsR0FBdUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25O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