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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsVG9rZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zZXJ2ZXIvc3JjL2dnbFRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQXNDO0FBRXRDO0lBV0ksWUFBWSxPQUFlLEVBQUUsTUFBZ0IsRUFBRSxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsWUFBc0IsRUFBRSxJQUFZLEVBQUUsSUFBZ0I7UUFUL0ksU0FBSSxHQUFlLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFVOUMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsQixvQkFBUSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztZQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO0lBQ0wsQ0FBQztJQUVELElBQVcsT0FBTyxLQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyRCxJQUFXLE1BQU0sS0FBZSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckQsSUFBVyxJQUFJLEtBQWlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRCxJQUFXLFlBQVksS0FBZSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDakUsSUFBVyxRQUFRLEtBQWEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25ELElBQVcsVUFBVSxLQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN2RCxJQUFXLFFBQVEsS0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDdkQsSUFBVyxNQUFNLEtBQWEsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ25ELElBQVcsWUFBWSxLQUFhLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUMvRCxJQUFXLFlBQVksQ0FBQyxLQUFhLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQ3hFO0FBdENELDRDQXNDQztBQUdELHNCQUE4QixTQUFRLGdCQUFnQjtJQUdsRCxZQUFZLE9BQWUsRUFBRSxNQUFnQixFQUFFLE1BQWMsRUFBRSxRQUFnQixFQUFFLE1BQWMsRUFBRSxZQUFzQixFQUFFLElBQVk7UUFDakksS0FBSyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUhqRyxlQUFVLEdBQXVCLEVBQUUsQ0FBQztJQUk1QyxDQUFDO0lBRU0sWUFBWSxDQUFDLFNBQTJCO1FBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFXLFVBQVUsS0FBeUIsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0NBQzFFO0FBWkQsNENBWUM7QUFFRCxJQUFZLFVBT1g7QUFQRCxXQUFZLFVBQVU7SUFDbEIseUVBQW1CLENBQUE7SUFDbkIseUVBQW1CLENBQUE7SUFDbkIsNkRBQWEsQ0FBQTtJQUNiLDZEQUFhLENBQUE7SUFDYixpREFBTyxDQUFBO0lBQ1AseURBQVcsQ0FBQTtBQUNmLENBQUMsRUFQVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQU9yQiJ9