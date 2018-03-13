"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var functions_1 = require("./functions");
var GGLVariableToken = (function () {
    function GGLVariableToken(content, scopes, lineNo, startPos, endPos, nestedGroups, file, type) {
        this.type = TokenTypes.NotDeclared;
        var helper = /([\w]+|~)/.exec(content);
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
    Object.defineProperty(GGLVariableToken.prototype, "Content", {
        get: function () { return this.content; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "Scopes", {
        get: function () { return this.scopes; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "Type", {
        get: function () { return this.type; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "NestedGroups", {
        get: function () { return this.nestedGroups; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "FileName", {
        get: function () { return this.file; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "LineNumber", {
        get: function () { return this.lineNo; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "StartPos", {
        get: function () { return this.startPos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "EndPos", {
        get: function () { return this.endPos; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GGLVariableToken.prototype, "DefaultValue", {
        get: function () { return this.defaultValue; },
        set: function (toSet) { this.defaultValue = toSet; },
        enumerable: true,
        configurable: true
    });
    return GGLVariableToken;
}());
exports.GGLVariableToken = GGLVariableToken;
var GGLFunctionToken = (function (_super) {
    __extends(GGLFunctionToken, _super);
    function GGLFunctionToken(content, scopes, lineNo, startPos, endPos, nestedGroups, file) {
        var _this = _super.call(this, content, scopes, lineNo, startPos, endPos, nestedGroups, file, TokenTypes.FunctionDeclatation) || this;
        _this.parameters = [];
        return _this;
    }
    GGLFunctionToken.prototype.addParameter = function (parameter) {
        this.parameters.push(parameter);
    };
    Object.defineProperty(GGLFunctionToken.prototype, "Parameters", {
        get: function () { return this.parameters; },
        enumerable: true,
        configurable: true
    });
    return GGLFunctionToken;
}(GGLVariableToken));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2dsVG9rZW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZ2xUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSx5Q0FBc0M7QUFFdEM7SUFXSSwwQkFBWSxPQUFlLEVBQUUsTUFBZ0IsRUFBRSxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsWUFBc0IsRUFBRSxJQUFZLEVBQUUsSUFBZ0I7UUFUL0ksU0FBSSxHQUFlLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFVOUMsSUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsQixvQkFBUSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztZQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO0lBQ0wsQ0FBQztJQUVELHNCQUFXLHFDQUFPO2FBQWxCLGNBQStCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzs7O09BQUE7SUFDckQsc0JBQVcsb0NBQU07YUFBakIsY0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUNyRCxzQkFBVyxrQ0FBSTthQUFmLGNBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7O09BQUE7SUFDbkQsc0JBQVcsMENBQVk7YUFBdkIsY0FBc0MsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUNqRSxzQkFBVyxzQ0FBUTthQUFuQixjQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ25ELHNCQUFXLHdDQUFVO2FBQXJCLGNBQWtDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O09BQUE7SUFDdkQsc0JBQVcsc0NBQVE7YUFBbkIsY0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUN2RCxzQkFBVyxvQ0FBTTthQUFqQixjQUE4QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztPQUFBO0lBQ25ELHNCQUFXLDBDQUFZO2FBQXZCLGNBQW9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzthQUMvRCxVQUF3QixLQUFhLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDOzs7T0FETjtJQUVuRSx1QkFBQztBQUFELENBQUMsQUF0Q0QsSUFzQ0M7QUF0Q1ksNENBQWdCO0FBeUM3QjtJQUFzQyxvQ0FBZ0I7SUFHbEQsMEJBQVksT0FBZSxFQUFFLE1BQWdCLEVBQUUsTUFBYyxFQUFFLFFBQWdCLEVBQUUsTUFBYyxFQUFFLFlBQXNCLEVBQUUsSUFBWTtRQUFySSxZQUNJLGtCQUFNLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsU0FDdkc7UUFKTyxnQkFBVSxHQUF1QixFQUFFLENBQUM7O0lBSTVDLENBQUM7SUFFTSx1Q0FBWSxHQUFuQixVQUFvQixTQUEyQjtRQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsc0JBQVcsd0NBQVU7YUFBckIsY0FBOEMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDOzs7T0FBQTtJQUMzRSx1QkFBQztBQUFELENBQUMsQUFaRCxDQUFzQyxnQkFBZ0IsR0FZckQ7QUFaWSw0Q0FBZ0I7QUFjN0IsSUFBWSxVQU9YO0FBUEQsV0FBWSxVQUFVO0lBQ2xCLHlFQUFtQixDQUFBO0lBQ25CLHlFQUFtQixDQUFBO0lBQ25CLDZEQUFhLENBQUE7SUFDYiw2REFBYSxDQUFBO0lBQ2IsaURBQU8sQ0FBQTtJQUNQLHlEQUFXLENBQUE7QUFDZixDQUFDLEVBUFcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUFPckIifQ==