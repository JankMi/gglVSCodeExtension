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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zZXJ2ZXIvc3JjL2dnbERvY3VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMENBQTBDO0FBQzFDLHlCQUF5QjtBQUd6QiwyQ0FBMEQ7QUFFMUQsMkNBQXdDO0FBRXhDO0lBRVcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQTZCO1FBQ3pELElBQUksT0FBTyxHQUEyQixxREFBcUQsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzFILEVBQUUsQ0FBQyxDQUFDLE9BQU8sT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqQyxNQUFNLFNBQVMsR0FBVyw2QkFBNkIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ2pGLG9CQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0QsT0FBTyxHQUFHLE9BQTBCLENBQUM7UUFDckMsSUFBSSxZQUFvQixDQUFDO1FBQ3pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLFlBQVksR0FBRyxHQUFHLENBQUM7UUFDdkIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFrQjtZQUNoQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNwQixRQUFRLEVBQUUsWUFBWTtTQUN6QixDQUFDO1FBQ0Ys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