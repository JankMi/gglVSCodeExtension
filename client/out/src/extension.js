"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const path = require("path");
// import { log } from "util";
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join("server", "server.js"));
    // The debug options for the server
    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions },
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: "file", language: "ggl" }],
        synchronize: {
            // Synchronize the setting section 'languageServerExample' to the server
            configurationSection: "ggl",
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
        },
    };
    // Create the language client and start the client.
    const disposable = new vscode_languageclient_1.LanguageClient("gglServer", "Language Server Example", serverOptions, clientOptions).start();
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map