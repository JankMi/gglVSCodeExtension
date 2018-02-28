import * as vscode from "vscode";
import {GGLVariableToken} from "./gglToken";

export interface IGGLDefinitionInformation {
    file: string;
    line: number;
    startPos: number;
    endPos: number;
}

export interface IGGLCompletionInformation {
    token: GGLVariableToken;
    type: vscode.CompletionItemKind;
}

export interface IGGLBuiltinCompletionInformation {
    label: string;
    comment: string;
    params: Array<{name: string, description: string}>;
    usages: Array<{functionName: string, call: string}>;
    returnValue: string;
    type: vscode.CompletionItemKind;
}

export interface ISection {
    beginAtLine: number;
    endAtLine: number;
    groupID: number;
}

export interface IRelativeFile {
    fileName: string;
    rootName: string;
}

export interface IGGLSignatureInformation {
    label: string;
    comment: string;
    params: Array<{name: string, description: string}>;
    usages: Array<{functionName: string, call: string}>;
    returnValue: string;
    activeParameter: number;
}
