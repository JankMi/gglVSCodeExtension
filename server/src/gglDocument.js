"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var filesystem = require("file-system");
var fs = require("fs");
var functions_1 = require("./functions");
var gglParser_1 = require("./gglParser");
var GGLDocument = (function () {
    function GGLDocument(fileLocation, content) {
        this.root = fileLocation.rootName;
        this.file = fileLocation.fileName;
        this.parser = new gglParser_1.GGLParser(content, fileLocation.rootName, fileLocation.fileName);
    }
    GGLDocument.createFromTextDoc = function (document) {
        var matches = /([0-9]\.[0-9][\w]*)[\\\/](((\w+)[\\\/])+)(\w+)\.ggl/.exec(document.uri.toString());
        if (typeof matches === typeof null) {
            var errString = "could not parse filepath: " + document.uri.toString();
            functions_1.logError(errString);
            throw new Error(errString);
        }
        matches = matches;
        var fileRootName;
        if (matches[5] === "main") {
            fileRootName = "~";
        }
        else {
            fileRootName = matches[2].slice(0, matches[2].length - 1);
        }
        var fileLocation = {
            fileName: matches[5],
            rootName: fileRootName,
        };
        return new GGLDocument(fileLocation, document.getText({ start: { line: 0, character: 0 }, end: { line: document.lineCount - 1, character: -1 } }));
    };
    GGLDocument.createFromPair = function (fileLocation, rootDir, projectDir) {
        if (projectDir === void 0) { projectDir = ""; }
        try {
            if (fileLocation.rootName === "~") {
                if (projectDir === "") {
                    functions_1.logError("no project dir given");
                    return undefined;
                }
                var filePath = rootDir + "/" + projectDir + "/" + fileLocation.fileName + ".ggl";
                var retValue = this.create(filePath, { rootName: projectDir, fileName: fileLocation.fileName });
                return retValue;
            }
            else {
                functions_1.logInfo("splitPath");
                var splitedPath = /([\S]+)genesis-([\w]+)[\\\/]([\w\.]+)/.exec(rootDir);
                if (splitedPath != null) {
                    splitedPath.forEach(function (match) { return functions_1.logInfo(match); });
                }
                else {
                    functions_1.logInfo(rootDir);
                }
                var absoluteFilePath_1;
                var importPaths = [];
                if (splitedPath != null) {
                    var reposBasePath = splitedPath[1];
                    var gamePackage = splitedPath[3];
                    var basePackageArray = /([0-9\.]+)/.exec(gamePackage);
                    if (typeof basePackageArray === typeof null) {
                    }
                    var basePackage = basePackageArray[1];
                    if (gamePackage !== basePackage) {
                        importPaths.push(reposBasePath + "genesis-games/" + gamePackage);
                    }
                    importPaths.push(reposBasePath + "genesis-games/" + basePackage);
                    importPaths.forEach(function (importPath) {
                        if (fs.existsSync(importPath + "/" + fileLocation.rootName)) {
                            filesystem.recurseSync(importPath + "/" + fileLocation.rootName, "**/" + fileLocation.fileName + ".ggl", function (filepath, relative, filename) {
                                if (!filename) {
                                    return;
                                }
                                absoluteFilePath_1 = filepath;
                                functions_1.logDebug("gglDocuments: 71, I have no idea what this should do");
                                return;
                            });
                        }
                    });
                    if (typeof absoluteFilePath_1 === typeof undefined) {
                        functions_1.logError("file: " + fileLocation.rootName + "@" + fileLocation.fileName + " coud not be opened");
                        importPaths.forEach(function (importPath) { return functions_1.logError("import-path: " + importPath); });
                        return undefined;
                    }
                }
                else {
                    functions_1.logError("could not split path: " + rootDir);
                    functions_1.logDebug("file: " + fileLocation.rootName + "@" + fileLocation.fileName + " coud not be opened");
                    return undefined;
                }
                var filePath = absoluteFilePath_1;
                var retValue = this.create(filePath, fileLocation);
                return retValue;
            }
        }
        catch (error) {
            functions_1.logError("file coud not be created " + error.message);
        }
    };
    GGLDocument.create = function (filePath, fileLocation) {
        var retValue;
        fs.exists(filePath, function (exists) {
            if (exists) {
                fs.readFile(filePath, "utf-8", function (errno, fileContent) {
                    retValue = new GGLDocument(fileLocation, fileContent);
                    if (retValue !== undefined) {
                        functions_1.logDebug("opended file: " + retValue.Root + "@" + retValue.File);
                        return retValue;
                    }
                    else {
                        functions_1.logDebug("file: " + fileLocation.rootName + "@" + fileLocation.fileName + " coud not be opened -> " + filePath);
                        return undefined;
                    }
                });
            }
            else {
                var errStr = "file does not exist: " + filePath;
                functions_1.logError(errStr);
            }
        });
        return retValue;
    };
    Object.defineProperty(GGLDocument.prototype, "Root", {
        get: function () { return this.root; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLDocument.prototype, "File", {
        get: function () { return this.file; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLDocument.prototype, "Parser", {
        get: function () { return this.parser; },
        enumerable: true,
        configurable: true
    });
    GGLDocument.prototype.updateFile = function () {
        return this.parser.updateTokens();
    };
    return GGLDocument;
}());
exports.GGLDocument = GGLDocument;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZ2xEb2N1bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdDQUEwQztBQUMxQyx1QkFBeUI7QUFHekIseUNBQTBEO0FBRTFELHlDQUF3QztBQUV4QztJQWlJSSxxQkFBWSxZQUEyQixFQUFFLE9BQWU7UUFDcEQsSUFBSSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUVsQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUkscUJBQVMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQXBJYSw2QkFBaUIsR0FBL0IsVUFBZ0MsUUFBNkI7UUFDekQsSUFBSSxPQUFPLEdBQTJCLHFEQUFxRCxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDMUgsRUFBRSxDQUFDLENBQUMsT0FBTyxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLElBQU0sU0FBUyxHQUFXLCtCQUE2QixRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBSSxDQUFDO1lBQ2pGLG9CQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBQ0QsT0FBTyxHQUFHLE9BQTBCLENBQUM7UUFDckMsSUFBSSxZQUFvQixDQUFDO1FBQ3pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLFlBQVksR0FBRyxHQUFHLENBQUM7UUFDdkIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osWUFBWSxHQUFH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