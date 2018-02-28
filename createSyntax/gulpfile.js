var gulp = require('gulp');
var fileSystem = require('file-system');
var fs = require('fs');
var path = require('path');

const pathToSources = "C:/Users/Michael/Documents/genesis-repos/genesis-apps/4.1"
const pathToJson = "../syntaxes/ggl.tmLanguage.gglBase.json"
const outputJson = "../syntaxes/ggl.tmLanguage.json"
const outputDir = "../doc/"

const regexprBuiltin = /struct ([a-z,A-Z]*)\s?:.*Builtin/g;

const regexDescription = /\/\*!\s([^\n]+)\n/
const regexDocLine = / ?\*?\s+\\(\w+) *((\w+)\(([\w\, {}<:>\[\]=\.\|\"äöüÄÖÜ-]*)\)(\s\\n)?|{([\S ]+)}| +(\w+)\s+([\S \.\,\"]+)| +(\S+)|\n)/
const regexNextIsUsage = / ?\*\s+(\w+)\(([\w\, <:>\[\]]+)\)(\s\\n)?/


gulp.task('default', function () {
    console.error("default - does nothing");
});

gulp.task('createSyntax', function () {
    var json = JSON.parse(fs.readFileSync(pathToJson));
    var jsonAppendBlock;
    if (json.repository.support != null && json.repository.support.patterns != null) {
        jsonAppendBlock = json.repository.support.patterns.length;
    } else {
        json.repository.support = ({ 'patterns': [] });
        jsonAppendBlock = 0;
    }
    fileSystem.recurseSync(pathToSources, ['**/*module.h'], function (filepath, relative, filename) {
        if (filename) {
            var fileBuiltins = [];
            var content = fs.readFileSync(filepath, "utf8");
            var lines = content.split("\n");
            lines.forEach(element => {
                var match = regexprBuiltin.exec(element);
                if (match != null) {
                    fileBuiltins.push(match[1]);
                }
            })
            if (fileBuiltins.length == 0) {
                console.debug("file without builtin: " + filename);
            } else {
                var name = filename.split('.')[0];
                var block = { 'name': 'support.function.ggl.' + name, 'match': '\\b(' + fileBuiltins.join("|") + ')\\b' };
                json.repository.support.patterns[jsonAppendBlock++] = block;
            }
        };

    })

    fs.writeFile(outputJson, JSON.stringify(json, null, "\t"));
});

gulp.task('createMinDoc', function () {
    console.error("creating json \"docs\"");
    var countBadDocus = 0;

    var allDocs = []
    fileSystem.recurseSync(pathToSources, ['**/*module.h'], function (filepath, relative, filename) {

        if (filename) {
            var fileBuiltins = [];
            var content = fs.readFileSync(filepath, "utf8");
            var lines = content.split("\n");
            lines.forEach(element => {
                var match = regexprBuiltin.exec(element);
                if (match != null) {
                    fileBuiltins.push(match[1]);
                }
            })
            if (fileBuiltins.length == 0) {
                console.debug("file without builtin: " + filename);
            } else {
                var name = filename.split('.')[0];
                fileSystem.recurseSync(pathToSources, [`**/${name}.cpp`], function (filepath, relative, filename) {
                    if (filename) {

                        var jsonFileObject = [];

                        var content = fs.readFileSync(filepath, "utf-8");

                        fileBuiltins.forEach(element => {

                            var docEntry = {
                                name: "name",
                                description: "description",
                                usages: [],
                                params: [],
                                returnValue: "returnValue",
                            };

                            // var firstOcc = content.indexOf(element)
                            // var posDoc = content.indexOf(element, firstOcc + 10);
                            var posDoc = content.search(`(usage|builtin).*${element}`)

                            var beginPos = content.lastIndexOf("!", posDoc) - 2;
                            var endPos = content.indexOf("*/", posDoc) + 2;

                            if (beginPos < 0 || endPos < 0) {
                                docEntry.description = element;
                                docEntry.name = element;
                                docEntry.params.push({ name: "no docu", description: "no docu" });
                                docEntry.returnValue = "no docu";
                                docEntry.usages.push({ functionName: element, call: "no docu" });
                                countBadDocus++;
                                jsonFileObject.push(docEntry);
                                console.debug(`Builtin: ${element} not found, of file ${name}`);
                            } else {
                                var doc = content.substring(beginPos, endPos)
                                docEntry.description = regexDescription.exec(doc)[1];
                                var docLines = doc.split("\n")

                                docEntry.name = element;

                                var debugDocLines = []
                                var nextIsUsage = false;
                                docLines.forEach(line => {
                                    if (nextIsUsage) {
                                        var entry = regexNextIsUsage.exec(line);
                                        if (entry == undefined) {
                                            nextIsUsage = false;
                                            return;
                                        }
                                        docEntry.usages.push({ functionName: entry[1], call: entry[2] })
                                        if (entry[3] == undefined) {
                                            nextIsUsage = false;
                                            return;
                                        }
                                    }

                                    line = line.split(/\([0-9]\)|<\/?b>|<\/?em>/).join("");
                                    debugDocLines.push(line);


                                    var entry = regexDocLine.exec(line);
                                    if (entry == undefined && line.indexOf("builtin") >= 0) {
                                        createBuiltin(line, docEntry);
                                    } else if (entry != undefined) {
                                        switch (entry[1]) {
                                            case "par":
                                                foundParam = true;
                                                docEntry.params.push({ name: entry[7], description: entry[8] })
                                                break;
                                            case "param":
                                                foundParam = true;
                                                docEntry.params.push({ name: entry[7], description: entry[8] })
                                                break;
                                            case "usage":
                                                if (entry[3] == undefined) {
                                                    createBuiltin(line, docEntry);
                                                    break;
                                                }
                                                try {
                                                    if (entry[3] == undefined || entry[4] == undefined) {
                                                        console.debug("usage, undefined")
                                                    }
                                                    docEntry.usages.push({ functionName: entry[3], call: entry[4] });
                                                } catch (error) {
                                                    console.debug("error on creating Object");
                                                }
                                                if (entry[5] != undefined) nextIsUsage = true;
                                                break;
                                            case "builtin":
                                                var builtinUsage = entry[6];
                                                createBuiltin(line, docEntry);
                                                break;
                                            case "return":
                                                docEntry.returnValue = entry[9];
                                            default:

                                                break;
                                        }
                                    }
                                })
                                if (docEntry.params.length < 1 && docEntry.usages.length > 0) {
                                    try {
                                        var groups = docEntry.usages[0].call.split(/\,/)
                                        groups.forEach(grous => {
                                            var matches = /(\w+) ?(\w*)/.exec(docEntry.usages[0].call)
                                            if (matches) {
                                                docEntry.params.push({ name: matches[1], description: matches[2] });
                                            }
                                        })
                                    } catch (error) {
                                        console.debug("error on create parameters of usage");
                                    }
                                }
                                if (docEntry.usages.length < 1) {
                                    console.debug(`no usage for ${docEntry.name}`)
                                }

                                jsonFileObject.push(docEntry);
                            }
                        })
                        allDocs = allDocs.concat(jsonFileObject)
                        fs.writeFile(outputDir + name + '_doc.json', JSON.stringify(jsonFileObject, null, "\t"));
                    } else {
                        console.log(`sourcefile ${name}.cpp not found`)

                    }
                })
            }
        };

    })
    fs.writeFile(outputDir + "allDocs" + '_doc.json', JSON.stringify(allDocs, null, "\t"));
    console.log(`${countBadDocus} Dokumentationen konnten nicht erstellt werden`)

});

function createBuiltin(line, docEntry) {
    var usage = /builtin{(\w+)\s*,([\w \,\\\[\]\|<>=]+)\s*}/.exec(line);

    if (usage == null) {
        var usage2 = /builtin{\s*(\w+)\s*}/.exec(line);
        if(usage2 != null){
            docEntry.usages.push({functionName: usage2[1], call:" "});
            return;
        }else{
            console.debug("no Builtin usage given")
            return;
        }

    }
    docEntry.usages.push({ functionName: usage[1], call: usage[2] });
}

gulp.task("fixRequire", function (){
    console.debug("fixRequire");
    
    fileSystem.recurseSync("../", ['out/*.js'], function (filepath, relative, filename) {
        var content = fs.readFileSync(filepath, "utf-8");
        var pos = content.indexOf("\"vscode-textmate\"");
        if (pos < 0){
            console.debug(`${filename}: no occurence`);
            return;
        }
        var newContent = content.substring(0,pos);
        newContent = newContent.concat("path.join(require.main.filename, '../../node_modules/vscode-textmate/release/main.js')");
        newContent = newContent.concat(content.substring(pos+"\"vscode-textmate\"".length,content.length));
        fs.writeFileSync(filepath,newContent,'utf-8');
        console.debug(`${filename}: changed`)
    })
})