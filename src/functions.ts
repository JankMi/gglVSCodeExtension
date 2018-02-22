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

// export function killProcess(p: cp.ChildProcess) {
// 	if (p) {
// 		try {
// 			p.kill();
// 		} catch (e) {
// 			console.log('Error killing process: ' + e);
// 			if (e && e.message && e.stack) {
// 				let matches = e.stack.match(/(src.go[a-z,A-Z]+\.js)/g);
// 				if (matches) {
//                     console.debug('errorKillingProcess', { message: e.message, stack: matches });
// 				}
// 			}

// 		}
// 	}
// }
