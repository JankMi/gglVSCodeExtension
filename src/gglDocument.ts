import * as filesystem from "file-system";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { logDebug, logError, logInfo } from "./functions";
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
    public static createFromPair(fileLocation: IRelativeFile, rootDir: string, projectDir: string = ""): Promise<{ document: GGLDocument }> {
        return new Promise((resolve, reject) => {
            try {
                if (fileLocation.rootName === "~") {
                    if (projectDir === "") {
                        logError("no project dir given");
                        return reject("no project dir given");
                    }
                    vscode.workspace.openTextDocument(vscode.Uri.file(rootDir + "\\" + projectDir + "\\" + fileLocation.fileName + ".ggl")).then((element) => {
                        const retValue = new GGLDocument(fileLocation, element);
                        if (retValue !== undefined) {
                            logDebug(`opended file: ${retValue.document.fileName}`);
                            return resolve({ document: retValue });
                        } else {
                            logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened -> ${element.fileName}`);
                            return reject(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                        }
                    });
                } else {
                    const splitedPath = /([\S]+)genesis-([\w]+)[\\\/]([\w\.]+)/.exec(rootDir);
                    let absoluteFilePath: string;
                    if (splitedPath != null) {
                        const reposBasePath: string = splitedPath[1];
                        const gameType = splitedPath[2]; // playground or games
                        const gamePackage = splitedPath[3]; // like 4.1_maks ...
                        const basePackage = /([0-9\.]+)/.exec(gamePackage)[1]; // for stdggl and commons

                        // create import base pathes
                        const importPathes: string[] = [];
                        if (gamePackage !== basePackage) { importPathes.push(reposBasePath + "genesis-games/" + gamePackage); }
                        importPathes.push(reposBasePath + "genesis-games/" + basePackage);
                        // todo: add configuration path
                        const configuration: string = vscode.workspace.getConfiguration("JankMi.genesisvscode").get("gglConfiguration.gglVersion");
                        importPathes.forEach((importPath) => {
                            filesystem.recurseSync(`${importPath}/${fileLocation.rootName}`, `**/${fileLocation.fileName}.ggl`, (filepath, relative, filename) => {
                                if (!filename) { return; }
                                absoluteFilePath = filepath;
                                return;
                            });
                        });
                        if (absoluteFilePath === undefined) {
                            logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                            return reject(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                        }
                    } else {
                        logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                        return reject(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                    }
                    let retValue: GGLDocument;
                    vscode.workspace.openTextDocument(absoluteFilePath).then((element) => {
                        retValue = new GGLDocument(fileLocation, element);
                        if (retValue !== undefined) {
                            logDebug(`opended file: ${retValue.document.fileName}`);
                            resolve({ document: retValue });
                        } else {
                            logDebug(`could not open file: ${retValue.document.fileName}`);
                            reject(`could not open file: ${retValue.document.fileName}`);
                        }
                    });
                }
            } catch (error) {
                logError(`file coud not be created ${error.toString}`);
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
