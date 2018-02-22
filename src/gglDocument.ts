import * as vscode from "vscode";
import { IRelativeFile } from "./gglInterfaces";
import { GGLParser } from "./gglParser";

export class GGLDocument {

    public static createFromTextDoc(document: vscode.TextDocument) {
        const matches = /([0-9]\.[0-9][\w]*)[\\\/](((\w+)[\\\/])+)(\w+)\.ggl/.exec(document.fileName);
        // tslint:disable-next-line:prefer-const
        const fileLocation: IRelativeFile = {
            fileName: matches[5],
            rootName: matches[2].slice(0, matches[2].length - 1),
        };
        return new GGLDocument(fileLocation, document);
    }
    public static createFromPair(fileLocation: IRelativeFile, rootDir: string): Promise<{ document: GGLDocument }> {
        return new Promise((resolve, reject) => {
            try {

                let doc: vscode.TextDocument;
                if (fileLocation.rootName === "~") {
                    vscode.workspace.openTextDocument(vscode.Uri.file(rootDir + "\\" + fileLocation.rootName + "\\" + fileLocation.fileName + ".ggl")).then((element) => { doc = element; });
                    const retValue = new GGLDocument(fileLocation, doc);
                    if (retValue !== undefined) {
                        console.debug(`opended file: ${retValue.document.fileName}`);
                        resolve({ document: retValue });
                    } else { console.debug("file coud not be created"); }
                } else {
                    const uri = vscode.Uri.file(rootDir + "/" + fileLocation.rootName + "/" + fileLocation.fileName + ".ggl");
                    let retValue: GGLDocument;
                    vscode.workspace.openTextDocument(uri).then((element) => {
                        retValue = new GGLDocument(fileLocation, element);
                        if (retValue !== undefined) {
                            console.debug(`opended file: ${retValue.document.fileName}`);
                            resolve({ document: retValue });
                        } else { console.debug(`could not open file: ${retValue.document.fileName}`); }
                    });
                }
            } catch (error) {
                console.debug(`file coud not be created ${error.toString}`);
            }
        });
    }
    private root: string;
    public get Root() { return this.root; }
    private file: string;
    public get File() { return this.file; }
    private parser: GGLParser;
    public get Parser() { return this.parser; }
    private document: vscode.TextDocument;
    public get Document() { return this.document; }

    constructor(fileLocation: IRelativeFile, document: vscode.TextDocument) {
        this.root = fileLocation.rootName;
        this.file = fileLocation.fileName;
        this.document = document;

        this.parser = new GGLParser(document);
    }

    public updateFile(): IRelativeFile[] {
        return this.parser.updateTokens();
    }
}
