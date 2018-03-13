"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filesystem = require("file-system");
const fs = require("fs");
const functions_1 = require("./functions");
const gglParser_1 = require("./gglParser");
class GGLDocument {
    static createFromTextDoc(document) {
        let matches = /([0-9]\.[0-9][\w]*)[\\\/](((\w+)[\\\/])+)(\w+)\.ggl/.exec(document.uri.toString());
        if (typeof matches === typeof null) {
            const errString = `could not parse filepath: ${document.uri.toString()}`;
            functions_1.logError(errString);
            throw new Error(errString);
        }
        matches = matches;
        let fileRootName;
        if (matches[5] === "main") {
            fileRootName = "~";
        }
        else {
            fileRootName = matches[2].slice(0, matches[2].length - 1);
        }
        const fileLocation = {
            fileName: matches[5],
            rootName: fileRootName,
        };
        return new GGLDocument(fileLocation, document.getText({ start: { line: 0, character: 0 }, end: { line: document.lineCount - 1, character: -1 } }));
    }
    static createFromPair(fileLocation, rootDir, projectDir = "") {
        try {
            if (fileLocation.rootName === "~") {
                if (projectDir === "") {
                    functions_1.logError("no project dir given");
                    return undefined;
                }
                const filePath = rootDir + "/" + projectDir + "/" + fileLocation.fileName + ".ggl";
                const retValue = this.create(filePath, { rootName: projectDir, fileName: fileLocation.fileName });
                return retValue;
            }
            else {
                functions_1.logInfo("splitPath");
                const splitedPath = /([\S]+)genesis-([\w]+)[\\\/]([\w\.]+)/.exec(rootDir);
                if (splitedPath != null) {
                    splitedPath.forEach((match) => functions_1.logInfo(match));
                }
                else {
                    functions_1.logInfo(rootDir);
                }
                let absoluteFilePath;
                const importPaths = [];
                if (splitedPath != null) {
                    const reposBasePath = splitedPath[1];
                    const gamePackage = splitedPath[3];
                    const basePackageArray = /([0-9\.]+)/.exec(gamePackage);
                    if (typeof basePackageArray === typeof null) {
                    }
                    const basePackage = basePackageArray[1];
                    if (gamePackage !== basePackage) {
                        importPaths.push(reposBasePath + "genesis-games/" + gamePackage);
                    }
                    importPaths.push(reposBasePath + "genesis-games/" + basePackage);
                    importPaths.forEach((importPath) => {
                        if (fs.existsSync(`${importPath}/${fileLocation.rootName}`)) {
                            filesystem.recurseSync(`${importPath}/${fileLocation.rootName}`, `**/${fileLocation.fileName}.ggl`, (filepath, relative, filename) => {
                                if (!filename) {
                                    return;
                                }
                                absoluteFilePath = filepath;
                                functions_1.logDebug("gglDocuments: 71, I have no idea what this should do");
                                return;
                            });
                        }
                    });
                    if (typeof absoluteFilePath === typeof undefined) {
                        functions_1.logError(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                        importPaths.forEach((importPath) => functions_1.logError(`import-path: ${importPath}`));
                        return undefined;
                    }
                }
                else {
                    functions_1.logError(`could not split path: ${rootDir}`);
                    functions_1.logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened`);
                    return undefined;
                }
                const filePath = absoluteFilePath;
                const retValue = this.create(filePath, fileLocation);
                return retValue;
            }
        }
        catch (error) {
            functions_1.logError(`file coud not be created ${error.message}`);
        }
    }
    static create(filePath, fileLocation) {
        let retValue;
        fs.exists(filePath, (exists) => {
            if (exists) {
                fs.readFile(filePath, "utf-8", (errno, fileContent) => {
                    retValue = new GGLDocument(fileLocation, fileContent);
                    if (retValue !== undefined) {
                        functions_1.logDebug(`opended file: ${retValue.Root}@${retValue.File}`);
                        return retValue;
                    }
                    else {
                        functions_1.logDebug(`file: ${fileLocation.rootName}@${fileLocation.fileName} coud not be opened -> ${filePath}`);
                        return undefined;
                    }
                });
            }
            else {
                const errStr = `file does not exist: ${filePath}`;
                functions_1.logError(errStr);
            }
        });
        return retValue;
    }
    get Root() { return this.root; }
    get File() { return this.file; }
    get Parser() { return this.parser; }
    constructor(fileLocation, content) {
        this.root = fileLocation.rootName;
        this.file = fileLocation.fileName;
        this.parser = new gglParser_1.GGLParser(content, fileLocation.rootName, fileLocation.fileName);
    }
    updateFile() {
        return this.parser.updateTokens();
    }
}
exports.GGLDocument = GGLDocument;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZ2xEb2N1bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBDQUEwQztBQUMxQyx5QkFBeUI7QUFHekIsMkNBQTBEO0FBRTFELDJDQUF3QztBQUV4QztJQUVXLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUE2QjtRQUN6RCxJQUFJLE9BQU8sR0FBMkIscURBQXFELENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMxSCxFQUFFLENBQUMsQ0FBQyxPQUFPLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxTQUFTLEdBQVcsNkJBQTZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNqRixvQkFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELE9BQU8sR0FBRyxPQUEwQixDQUFDO1FBQ3JDLElBQUksWUFBb0IsQ0FBQztRQUN6QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4QixZQUFZLEdBQUcsR0FBRyxDQUFDO1FBQ3ZCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLFlBQVksR0FBa0I7WUFDaEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDcEIsUUFBUSxFQUFFLFlBQVk7U0FDekIsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLFdBQVcs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