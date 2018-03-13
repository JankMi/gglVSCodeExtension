import * as filesystem from "file-system";
import * as fs from "fs";
// import * as path from "path";
import * as vscode from "vscode-languageserver";
import { logDebug, logError, logInfo } from "./functions";
import { IRelativeFile } from "./gglInterfaces";
import { GGLParser } from "./gglParser";

export class GGLDocument {

    public static createFromTextDoc(document: vscode.TextDocument) {
        let matches: RegExpExecArray | null = /([0-9]\.[0-9][\w]*)[\\\/](((\w+)[\\\/])+)(\w+)\.ggl/.exec(document.uri.toString());
        if (typeof matches === typeof null) {
            const errString: string = `could not parse filepath: ${document.uri.toString()}`;
            logError(errString)
            throw new Error(errString);
        }
        matches = matches as RegExpExecArray;
        let fileRootName: string;
        if (matches[5] === "main") {
            fileRootName = "~";
        } else {
            fileRootName = matches[2].slice(0, matches[2].length - 1);
        }
        // tslint:disable-next-line:prefer-const
        const fileLocation: IRelativeFile = {
            fileName: matches[5],
            rootName: fileRootName,
        };
        return new GGLDocument(fileLocation, document.getText({ start: { line: 0, character: 0 }, end: { line: document.lineCount - 1, character: -1 } }));
    }

    public static createFromPair(fileLocation: IRelativeFile, rootDir: string, projectDir: string = ""): GGLDocument | undefined {

        try {
            if (fileLocation.rootName === "~") {
                if (projectDir === "") {
                    logError("no project dir given");
                    return undefined;
                }
                const filePath: string = rootDir + "/" + projectDir + "/" + fileLocation.fileName + ".ggl";
                const retValue: GGLDocument | undefined = this.create(filePath, {rootName: projectDir, fileName: fileLocation.fileName});
                return retValue;
            } else {
                logInfo("splitPath");
                const splitedPath = /([\S]+)genesis-([\w]+)[\\\/]([\w\.]+)/.exec(rootDir);
                if (splitedPath != null) { splitedPath.forEach((match) => logInfo(match)); } else { logInfo(rootDir); }
                let absoluteFilePath: string | undefined;
                const importPaths: string[] = [];
                if (splitedPath != null) {
                    const reposBasePath: string = splitedPath[1];
                    // const gameType = splitedPath[2]; // playground or games
                    const gamePackage: string = splitedPath[3]; // like 4.1_maks ...
                    const basePackageArray: RegExpExecArray | null = /([0-9\.]+)/.exec(gamePackage); // for stdggl and commons
                    if (typeof basePackageArray === typeof null) {
                        // bad thing
                    }
                    const basePackage = (basePackageArray as RegExpExecArray)[1];


                    // create import base pathes
                    if (gamePackage !== basePackage) { importPaths.push(reposBasePath + "genesis-games/" + gamePackage); }
                    importPaths.push(reposBasePath + "genesis-games/" + basePackage);
                    // todo: add configuration path
                    // const configuration: string = vscode.workspace.getConfiguration("JankMi.genesisvscode").get("gglConfiguration.gglVersion");
                    importPaths.forEach((importPath) => {
                        if (fs.existsSync(`${importPath}/${fileLocation.rootName}`)) {
                            filesystem.recurseSync(`${importPath}/${fileLocation.rootName}`, `**/${fileLocation.fileName}.ggl`, (filepath: string, relative: string, filename : string) => {
                                if (!filename) { return; }
                                absoluteFilePath = filepath;
                                logDebug("gglDocuments: 71, I have no idea what this should do");
                                return;
                            });
                        }
                    });
                    if (typeof absoluteFilePath === typeof undefined) {
                        logError(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                        importPaths.forEach((importPath) => logError(`import-path: ${importPath}`));
                        return undefined;
                    }
                } else {
                    logError(`could not split path: ${rootDir}`);
                    logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                    return undefined;
                }

                const filePath: string = absoluteFilePath as string;
                const retValue: GGLDocument | undefined = this.create(filePath, fileLocation);
                return retValue

                // vscode.workspace.openTextDocument(absoluteFilePath).then((element) => {
                //     retValue = new GGLDocument(fileLocation, element);
                //     if (retValue !== undefined) {
                //         logDebug(`opended file: ${retValue.document.fileName}`);
                //         resolve({ document: retValue });
                //     } else {
                //         logDebug(`could not open file: ${retValue.document.fileName}`);
                //         reject(`could not open file: ${retValue.document.fileName}`);
                //     }
                // });
            }
        } catch (error) {
            logError(`file coud not be created ${error.message}`);
        }
    }

    private static create(filePath: string, fileLocation: IRelativeFile): GGLDocument | undefined {
        let retValue : GGLDocument | undefined;
        fs.exists(filePath, (exists: boolean) => {
            if (exists) {
                fs.readFile(filePath, "utf-8", (errno: NodeJS.ErrnoException, fileContent: string) => {
                    retValue = new GGLDocument(fileLocation, fileContent);
                    if (retValue !== undefined) {
                        logDebug(`opended file: ${retValue.Root}@${retValue.File}`);
                        return retValue;
                    }
                    else {
                        logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened -> ${filePath}`);
                        return undefined;
                    }
                });
            }
            else {
                const errStr: string = `file does not exist: ${filePath}`;
                logError(errStr);
            }
        });
        return retValue;
    }

    private root : string;
    public get Root() { return this.root; }
    private file: string;
    public get File() { return this.file; }
    private parser: GGLParser;
    public get Parser() { return this.parser; }

    constructor(fileLocation: IRelativeFile, content: string) {
        this.root = fileLocation.rootName;
        this.file = fileLocation.fileName;

        this.parser = new GGLParser(content, fileLocation.rootName, fileLocation.fileName);
    }

    public updateFile(): IRelativeFile[] | undefined{
        return this.parser.updateTokens();
    }

    // public reloadDoc(newDocument: vscode.TextDocument): IRelativeFile[] {
    //     this.parser = new GGLParser(newDocument);
    //     return this.updateFile();
    // }
}
