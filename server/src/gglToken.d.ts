export declare class GGLVariableToken {
    private content;
    private type;
    private scopes;
    private nestedGroups;
    private file;
    private lineNo;
    private startPos;
    private endPos;
    private defaultValue;
    constructor(content: string, scopes: string[], lineNo: number, startPos: number, endPos: number, nestedGroups: number[], file: string, type: TokenTypes);
    readonly Content: string;
    readonly Scopes: string[];
    readonly Type: TokenTypes;
    readonly NestedGroups: number[];
    readonly FileName: string;
    readonly LineNumber: number;
    readonly StartPos: number;
    readonly EndPos: number;
    DefaultValue: string;
}
export declare class GGLFunctionToken extends GGLVariableToken {
    private parameters;
    constructor(content: string, scopes: string[], lineNo: number, startPos: number, endPos: number, nestedGroups: number[], file: string);
    addParameter(parameter: GGLVariableToken): void;
    readonly Parameters: GGLVariableToken[];
}
export declare enum TokenTypes {
    VariableDeclaration = 0,
    FunctionDeclatation = 1,
    VariableUsage = 2,
    FunctionUsage = 3,
    Keyword = 4,
    NotDeclared = 5,
}
