import Parser, { SyntaxNode } from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import { ParsedFunction } from "@codesense/shared";

const JS_FUNCTION_TYPES = new Set<string>([
  "function_declaration",
  "function",
  "method_definition",
  "arrow_function",
  "generator_function_declaration"
]);

const PYTHON_FUNCTION_TYPES = new Set<string>(["function_definition"]);

const parser = new Parser();
const JAVASCRIPT_LANGUAGE = JavaScript as unknown as Parser.Language;
const PYTHON_LANGUAGE = Python as unknown as Parser.Language;

const normalizeLanguage = (language: string): "javascript" | "python" => {
  const normalized = language.toLowerCase();
  if (["javascript", "js", "typescript", "ts", "tsx", "jsx"].includes(normalized)) {
    return "javascript";
  }
  if (["python", "py"].includes(normalized)) {
    return "python";
  }
  throw new Error(`Unsupported language for parser: ${language}`);
};

const resolveLanguage = (language: "javascript" | "python"): Parser.Language => {
  if (language === "javascript") {
    return JAVASCRIPT_LANGUAGE;
  }
  return PYTHON_LANGUAGE;
};

const isFunctionNode = (node: SyntaxNode, language: "javascript" | "python"): boolean => {
  if (language === "javascript") {
    return JS_FUNCTION_TYPES.has(node.type);
  }
  return PYTHON_FUNCTION_TYPES.has(node.type);
};

const parseParameterList = (raw: string): string[] => {
  const trimmed = raw.trim();
  const stripped = trimmed
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/^\{/, "")
    .replace(/\}$/, "");

  if (!stripped) {
    return [];
  }

  return stripped
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const inferFunctionName = (node: SyntaxNode): string => {
  const nameNode = node.childForFieldName("name");
  if (nameNode?.text) {
    return nameNode.text;
  }

  if (node.type === "arrow_function") {
    const parent = node.parent;
    if (parent?.type === "variable_declarator") {
      const variableName = parent.childForFieldName("name");
      if (variableName?.text) {
        return variableName.text;
      }
    }
  }

  return `anonymous@${node.startPosition.row + 1}`;
};

const inferAsync = (node: SyntaxNode, source: string, language: "javascript" | "python"): boolean => {
  if (language === "python") {
    return source.trimStart().startsWith("async def ");
  }

  const firstNamed = node.namedChild(0);
  if (firstNamed?.type === "identifier" && firstNamed.text === "async") {
    return true;
  }

  return /^async\b/.test(source.trimStart());
};

export const parseFunctions = (code: string, language: string): ParsedFunction[] => {
  const normalizedLanguage = normalizeLanguage(language);
  parser.setLanguage(resolveLanguage(normalizedLanguage));
  const tree = parser.parse(code);
  const functions: ParsedFunction[] = [];

  const visit = (node: SyntaxNode | null | undefined, functionDepth: number): void => {
    if (!node) {
      return;
    }

    const isFunction = isFunctionNode(node, normalizedLanguage);
    let nextDepth = functionDepth;

    if (isFunction) {
      const source = code.slice(node.startIndex, node.endIndex);
      const parameterNode = node.childForFieldName("parameters");
      const parameters = parseParameterList(parameterNode?.text ?? "");

      functions.push({
        name: inferFunctionName(node),
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        source,
        parameters,
        isAsync: inferAsync(node, source, normalizedLanguage),
        nestingDepth: functionDepth,
        language: normalizedLanguage
      });

      nextDepth += 1;
    }

    for (const child of node.namedChildren) {
      if (!child) {
        continue;
      }
      visit(child, nextDepth);
    }
  };

  visit(tree.rootNode, 0);
  if (functions.length > 0) {
    return functions;
  }

  return fallbackParseFunctions(code, normalizedLanguage);
};

const lineOfIndex = (source: string, index: number): number => source.slice(0, index).split("\n").length;

const braceDepthAt = (source: string, index: number): number => {
  const prefix = source.slice(0, index);
  const opens = prefix.match(/\{/g)?.length ?? 0;
  const closes = prefix.match(/\}/g)?.length ?? 0;
  return Math.max(0, opens - closes);
};

const indentationDepthAt = (source: string, index: number): number => {
  const line = source.slice(0, index).split("\n").pop() ?? "";
  const spaces = line.match(/^\s*/)?.[0].length ?? 0;
  return Math.floor(spaces / 4);
};

const fallbackParseFunctions = (
  code: string,
  language: "javascript" | "python"
): ParsedFunction[] => {
  const results: ParsedFunction[] = [];

  if (language === "javascript") {
    const declaration = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
    const arrow = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s*)?\(([^)]*)\)\s*=>/g;

    for (const match of code.matchAll(declaration)) {
      const name = match[1];
      if (!name) {
        continue;
      }
      const parameters = parseParameterList(match[2] ?? "");
      const startIndex = match.index ?? 0;
      const startLine = lineOfIndex(code, startIndex);
      results.push({
        name,
        startLine,
        endLine: startLine,
        source: "",
        parameters,
        isAsync: false,
        nestingDepth: braceDepthAt(code, startIndex),
        language
      });
    }

    for (const match of code.matchAll(arrow)) {
      const name = match[1];
      if (!name) {
        continue;
      }
      const isAsync = Boolean(match[2]?.trim());
      const parameters = parseParameterList(match[3] ?? "");
      const startIndex = match.index ?? 0;
      const startLine = lineOfIndex(code, startIndex);
      results.push({
        name,
        startLine,
        endLine: startLine,
        source: "",
        parameters,
        isAsync,
        nestingDepth: braceDepthAt(code, startIndex),
        language
      });
    }

    return results;
  }

  const pythonFn = /^(async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:/gm;
  for (const match of code.matchAll(pythonFn)) {
    const name = match[2];
    if (!name) {
      continue;
    }
    const startIndex = match.index ?? 0;
    const startLine = lineOfIndex(code, startIndex);
    results.push({
      name,
      startLine,
      endLine: startLine,
      source: "",
      parameters: parseParameterList(match[3] ?? ""),
      isAsync: Boolean(match[1]),
      nestingDepth: indentationDepthAt(code, startIndex),
      language
    });
  }

  return results;
};
