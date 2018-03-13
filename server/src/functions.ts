
import * as vsTM from "vscode-textmate";

import { log } from "util";

export function getTokenContent(line: string, token: vsTM.IToken): string {
    return line.substring(token.startIndex, token.endIndex);
}

export function logInfo(message: string) {
    log(message);
}

export function logDebug(message: string) {
    log(message);
    // vscode.window.showInformationMessage(message);
}

export function logError(message: string) {
    log(message);
}
