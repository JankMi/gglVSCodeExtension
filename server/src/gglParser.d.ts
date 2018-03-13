import * as vsTM from "vscode-textmate";
import { IRelativeFile, ISection } from "./gglInterfaces";
import { GGLFunctionToken, GGLVariableToken } from "./gglToken";
export declare class GGLParser {
    static init(): void;
    private static tmRegistry;
    private static tmGrammar;
    private document;
    private rootName;
    private fileName;
    static readonly TM_Grammar: vsTM.IGrammar;
    private variables;
    readonly VariableDefinitions: GGLVariableToken[];
    private functions;
    readonly FunctionDefinitions: GGLFunctionToken[];
    private sections;
    private imports;
    readonly Sections: ISection[];
    constructor(document: string, rootName: string, fileName: string);
    updateTokens(): IRelativeFile[] | undefined;
    private getTokensFromString(fileContent);
}
