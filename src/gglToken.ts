export class GGLVariableToken {
    private content: string;
    private type: TokenTypes = TokenTypes.NotDeclared;
    private scopes: string[];
    private nestedGroups: number[];
    private file: string;
    private lineNo: number;
    private startPos: number;
    private endPos: number;
    private defaultValue: string;

    constructor(content: string, scopes: string[], lineNo: number, startPos: number, endPos: number, nestedGroups: number[], file: string, type: TokenTypes) {
        const helper = /([\w]+|~)/.exec(content);
        if (helper === null) {
            console.debug(file + lineNo);
        }
//        this.content = /(\w+)/.exec(content)[1];
        this.content = helper [1];
        this.scopes = scopes;
        this.file = file;
        this.lineNo = lineNo;
        this.nestedGroups = nestedGroups;
        this.startPos = startPos;
        this.endPos = endPos;
        this.type = type;
    }

    public get Content(): string { return this.content; }
    public get Scopes(): string[] { return this.scopes; }
    public get Type(): TokenTypes { return this.type; }
    public get NestedGroups(): number[] { return this.nestedGroups; }
    public get FileName(): string { return this.file; }
    public get LineNumber(): number { return this.lineNo; }
    public get StartPos(): number { return this.startPos; }
    public get EndPos(): number { return this.endPos; }
    public get DefaultValue(): string {return this.defaultValue; }
    public set DefaultValue(toSet: string) { this.defaultValue = toSet; }
}

export class GGLFunctionToken extends GGLVariableToken {
    private parameters: GGLVariableToken[] = [];

    constructor(content: string, scopes: string[], lineNo: number, startPos: number, endPos: number, nestedGroups: number[], file: string) {
        super(content, scopes, lineNo, startPos, endPos, nestedGroups, file, TokenTypes.FunctionDeclatation);
    }

    public addParameter(parameter: GGLVariableToken) {
        this.parameters.push(parameter);
    }

    public get Parameters(): GGLVariableToken[] { return this.parameters; }
}

export enum TokenTypes {
    VariableDeclaration,
    FunctionDeclatation,
    VariableUsage,
    FunctionUsage,
    Keyword,
    NotDeclared,
}
