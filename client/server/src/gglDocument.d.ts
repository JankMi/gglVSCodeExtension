import * as vscode from "vscode-languageserver";
import { IRelativeFile } from "./gglInterfaces";
import { GGLParser } from "./gglParser";
export declare class GGLDocument {
    static createFromTextDoc(document: vscode.TextDocument): GGLDocument;
    static createFromPair(fileLocation: IRelativeFile, rootDir: string, projectDir?: string): GGLDocument | undefined;
    private static create(filePath, fileLocation);
    private root;
    readonly Root: string;
    private file;
    readonly File: string;
    private parser;
    readonly Parser: GGLParser;
    constructor(fileLocation: IRelativeFile, content: string);
    updateFile(): IRelativeFile[] | undefined;
}
