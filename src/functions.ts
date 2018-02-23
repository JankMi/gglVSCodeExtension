// import * as cp from 'child_process'
// import * as vsTM from "C:/Program Files/Microsoft VS Code/resources/app/node_modules/vscode-textmate";
import * as vsTM from "vscode-textmate";

import * as vscode from "vscode";
import { CompletionItem } from "vscode";

import { GGLParser } from "./gglParser";
import { GGLToken } from "./gglToken";

export function getTokenContent(line: string, token: vsTM.IToken): string {
    return line.substring(token.startIndex, token.endIndex);
}

export function logInfo(message: string) {
    console.log(message);
}

export function logDebug(message: string) {
    console.log(message);
    vscode.window.showInformationMessage(message);
}

export function logError(message: string) {
    console.log(message);
    vscode.window.showErrorMessage(message);
}
