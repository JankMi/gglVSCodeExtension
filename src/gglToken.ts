export class GGLToken {
    private content: string;
    private type: TokenTypes = TokenTypes.NotDeclared;
    private scopes: string[];
    private nestedGroups: number[];
    private file: string;
    private lineNo: number;
    private startPos: number;
    private endPos: number;

    constructor(content: string, scopes: string[], lineNo: number, startPos: number, endPos: number, nestedGroups: number[], file: string) {
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

        if (/\bkeyword\.control\.[\w\.]*/.exec(scopes[scopes.length - 1])) {
            this.type = TokenTypes.Keyword;
        } else if (/variable.other.readwrite.ggl/.exec(scopes[scopes.length - 1])) {
            this.type = TokenTypes.VariableDeclaration;
        } else if (scopes[scopes.length - 1].startsWith("entity.name.function.ggl")) {
            this.type = TokenTypes.FunctionDeclatation;
        }
    }

    public get Content(): string { return this.content; }
    public get Scopes(): string[] { return this.scopes; }
    public get Type(): TokenTypes { return this.type; }
    public get NestedGroups(): number[] { return this.nestedGroups; }
    public get FileName(): string { return this.file; }
    public get LineNumber(): number { return this.lineNo; }
    public get StartPos(): number { return this.startPos; }
    public get EndPos(): number { return this.endPos; }
}

export enum TokenTypes {
    VariableDeclaration,
    FunctionDeclatation,
    VariableUsage,
    FunctionUsage,
    Keyword,
    NotDeclared,
}
