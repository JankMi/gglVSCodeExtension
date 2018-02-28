"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { CompletionItem } from "vscode";
import { getTokenContent, logDebug, logError } from "./functions";
import { GGLDocument } from "./gglDocument";
import { IGGLBuiltinCompletionInformation, IGGLCompletionInformation, IGGLDefinitionInformation, IGGLSignatureInformation } from "./gglInterfaces";
import { GGLParser } from "./gglParser";
import { GGLProjectLanguageSupport } from "./gglProjectLanguageSupport";
import { GGLVariableToken, TokenTypes } from "./gglToken";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    logDebug("activate: createParser");
    GGLParser.init();
    const gglLangSup = GGLProjectLanguageSupport.Instance;
    vscode.window.onDidChangeActiveTextEditor(gglLangSup.onActiveTexteditorChanged);
    vscode.workspace.onDidChangeTextDocument(gglLangSup.onTextDocumentChanged);

    // context.subscriptions.push(getDisposable());
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "ggl", scheme: "file" }, new GGLCompletionItemProvider(), " ", '\"'));
    logDebug("activate: registered CompletionItemProvider");

    // context.subscriptions.push(getDisposable());
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: "ggl", scheme: "file" }, new GGLBuiltinCompletionItemProvider(), ".", '\"'));
    logDebug("activate: registered BuilinCompletionItemProvider");

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: "ggl", scheme: "file" }, new GGLDefinitionProvider()));
    logDebug("activate: registered DefinitionProvider");

    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            { language: "ggl", scheme: "file" }, new GGLSignatureHelpProvider(), "(", ","));
    logDebug("activate: registered SignatureHelpProvider");

    // context.subscriptions.push(disposable);
}

export class GGLCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {
        return GGLProjectLanguageSupport.Instance.provideCompletions(document, position, token).then((completionInfos: IGGLCompletionInformation[]) => {
            const completionItems: CompletionItem[] = [];
            completionInfos.forEach((element: IGGLCompletionInformation) => { completionItems.push(new CompletionItem(element.token.Content, element.type)); });
            return completionItems;
        }, (err) => {
            if (err) {
                logError(`some error oO => ${err}`);
            }
            return Promise.resolve(null);
        });
    }
}

export class GGLBuiltinCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.CompletionItem[]> {
        return GGLProjectLanguageSupport.Instance.provideBuiltinCompletions(document, position, token).then((completionInfos: IGGLBuiltinCompletionInformation[]) => {
            const completionItems: CompletionItem[] = [];
            let toAdd: CompletionItem;
            completionInfos.forEach((element: IGGLBuiltinCompletionInformation) => {

                if (element.usages.length !== 0) {
                    element.usages.forEach((usage: { functionName: string, call: string }) => {
                        toAdd = this.createEnty(element, usage, position);
                        completionItems.push(toAdd);
                    });
                } else {
                    toAdd = this.createEnty(element, undefined, position);
                    completionItems.push(toAdd);
                }
            });
            return completionItems;
        }, (err) => {
            if (err) {
                logError(`some error oO => ${err}`);
            }
            return Promise.resolve(null);
        });
    }

    private createEnty(element: IGGLBuiltinCompletionInformation, usage: { functionName: string; call: string; }, position: vscode.Position) {
        const newEntry = new CompletionItem(element.label, element.type);
        const documentation: string[] = [];
        if (usage === undefined) {
            documentation.push(`usage not found in docu\n`);
        } else {
            documentation.push(`${usage.functionName}(${usage.call})\n`);
        }

        const snippet: vscode.SnippetString = new vscode.SnippetString(`${element.label}(`);
        newEntry.insertText = snippet;
        documentation.push(`returnValue: ${element.returnValue}`);
        newEntry.documentation = documentation.join("\n");
        newEntry.detail = element.comment;
        return newEntry;
    }
}

export class GGLDefinitionProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.Location> {
        return GGLProjectLanguageSupport.Instance.provideDefinition(document, position, token).then((definitionInfo: IGGLDefinitionInformation) => {
            let definitionResource: vscode.Uri;
            try {
                definitionResource = vscode.Uri.file(definitionInfo.file);

            } catch (error) {
                logError("could not create uri\n");
                return undefined;
            }
            const pos = new vscode.Position(definitionInfo.line, definitionInfo.startPos);
            return new vscode.Location(definitionResource, pos);
        }, (err) => {
            if (err) {
                logError(`some error oO => ${err}`);
            }
            return Promise.resolve(null);
        });
    }
}

export class GGLSignatureHelpProvider implements vscode.SignatureHelpProvider {
    public provideSignatureHelp(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        vscode.ProviderResult<vscode.SignatureHelp> {
        return GGLProjectLanguageSupport.Instance.provideSignatureInformations(document, position, token).then((signatureInfos: IGGLSignatureInformation[]) => {

            let signatureHelpItem: vscode.SignatureInformation;
            const signatures: vscode.SignatureHelp = new vscode.SignatureHelp();
            if (signatureInfos.length === 0) { return signatures; }

            signatureInfos.forEach((signatureInfo) => {
                signatureInfo.usages.forEach((usage) => {
                    signatureHelpItem = new vscode.SignatureInformation(signatureInfo.label, `${usage.functionName}(${usage.call})`);
                    signatureInfo.params.forEach((parameter) => {
                        signatureHelpItem.parameters.push( new vscode.ParameterInformation(parameter.name, parameter.description));
                    });
                    signatures.signatures.push(signatureHelpItem);
                });
            });
            signatures.activeParameter = signatureInfos[0].activeParameter;
            signatures.activeSignature = 0;
            return signatures;
        }, (err) => {
            if (err) {
                logError(`some error oO => ${err}`);
            }
            return Promise.resolve(null);
        });
    }
}
