"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("./functions");
class GGLVariableToken {
    constructor(content, scopes, lineNo, startPos, endPos, nestedGroups, file, type) {
        this.type = TokenTypes.NotDeclared;
        const helper = /([\w]+|~)/.exec(content);
        if (helper === null) {
            functions_1.logDebug(file + lineNo);
        }
        else {
            this.content = helper[1];
            this.scopes = scopes;
            this.file = file;
            this.lineNo = lineNo;
            this.nestedGroups = nestedGroups;
            this.startPos = startPos;
            this.endPos = endPos;
            this.type = type;
        }
    }
    get Content() { return this.content; }
    get Scopes() { return this.scopes; }
    get Type() { return this.type; }
    get NestedGroups() { return this.nestedGroups; }
    get FileName() { return this.file; }
    get LineNumber() { return this.lineNo; }
    get StartPos() { return this.startPos; }
    get EndPos() { return this.endPos; }
    get DefaultValue() { return this.defaultValue; }
    set DefaultValue(toSet) { this.defaultValue = toSet; }
}
exports.GGLVariableToken = GGLVariableToken;
class GGLFunctionToken extends GGLVariableToken {
    constructor(content, scopes, lineNo, startPos, endPos, nestedGroups, file) {
        super(content, scopes, lineNo, startPos, endPos, nestedGroups, file, TokenTypes.FunctionDeclatation);
        this.parameters = [];
    }
    addParameter(parameter) {
        this.parameters.push(parameter);
    }
    get Parameters() { return this.parameters; }
}
exports.GGLFunctionToken = GGLFunctionToken;
var TokenTypes;
(function (TokenTypes) {
    TokenTypes[TokenTypes["VariableDeclaration"] = 0] = "VariableDeclaration";
    TokenTypes[TokenTypes["FunctionDeclatation"] = 1] = "FunctionDeclatation";
    TokenTypes[TokenTypes["VariableUsage"] = 2] = "VariableUsage";
    TokenTypes[TokenTypes["FunctionUsage"] = 3] = "FunctionUsage";
    TokenTypes[TokenTypes["Keyword"] = 4] = "Keyword";
    TokenTypes[TokenTypes["NotDeclared"] = 5] = "NotDeclared";
})(TokenTypes = exports.TokenTypes || (exports.TokenTypes = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsVG9rZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZ2xUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJDQUFzQztBQUV0QztJQVdJLFlBQVksT0FBZSxFQUFFLE1BQWdCLEVBQUUsTUFBYyxFQUFFLFFBQWdCLEVBQUUsTUFBYyxFQUFFLFlBQXNCLEVBQUUsSUFBWSxFQUFFLElBQWdCO1FBVC9JLFNBQUksR0FBZSxVQUFVLENBQUMsV0FBVyxDQUFDO1FBVTlDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEIsb0JBQVEsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQztJQUNMLENBQUM7SUFFRCxJQUFXLE9BQU8sS0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDckQsSUFBVyxNQUFNLEtBQWUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3JELElBQVcsSUFBSSxLQUFpQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkQsSUFBVyxZQUFZLEtBQWUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLElBQVcsUUFBUSxLQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRCxJQUFXLFVBQVUsS0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdkQsSUFBVyxRQUFRLEtBQWEsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELElBQVcsTUFBTSxLQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNuRCxJQUFXLFlBQVksS0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDL0QsSUFBVyxZQUFZLENBQUMsS0FBYSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztDQUN4RTtBQXRDRCw0Q0FzQ0M7QUFHRCxzQkFBOEIsU0FBUSxnQkFBZ0I7SUFHbEQsWUFBWSxPQUFlLEVBQUUsTUFBZ0IsRUFBRSxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsWUFBc0IsRUFBRSxJQUFZO1FBQ2pJLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFIakcsZUFBVSxHQUF1QixFQUFFLENBQUM7SUFJNUMsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUEyQjtRQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBVyxVQUFVLEtBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztDQUMxRTtBQVpELDRDQVlDO0FBRUQsSUFBWSxVQU9YO0FBUEQsV0FBWSxVQUFVO0lBQ2xCLHlFQUFtQixDQUFBO0lBQ25CLHlFQUFtQixDQUFBO0lBQ25CLDZEQUFhLENBQUE7SUFDYiw2REFBYSxDQUFBO0lBQ2IsaURBQU8sQ0FBQTtJQUNQLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBUFcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFPckIifQ==