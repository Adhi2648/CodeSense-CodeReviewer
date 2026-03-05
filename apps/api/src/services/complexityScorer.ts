import Parser, { SyntaxNode } from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import { ComplexityBand, ComplexityResult, ParsedFunction } from "@codesense/shared";

const parser = new Parser();
const JAVASCRIPT_LANGUAGE = JavaScript as unknown as Parser.Language;
const PYTHON_LANGUAGE = Python as unknown as Parser.Language;

const normalizeLanguage = (language: string): "javascript" | "python" => {
  const normalized = language.toLowerCase();
  if (["javascript", "js", "typescript", "ts", "tsx", "jsx"].includes(normalized)) {
    return "javascript";
  }
  return "python";
};

const resolveLanguage = (language: "javascript" | "python"): Parser.Language => {
  if (language === "javascript") {
    return JAVASCRIPT_LANGUAGE;
  }
  return PYTHON_LANGUAGE;
};

const bandForScore = (score: number): ComplexityBand => {
  if (score <= 5) {
    return "simple";
  }
  if (score <= 10) {
    return "moderate";
  }
  if (score <= 15) {
    return "complex";
  }
  return "very complex";
};

const shouldCountNode = (node: SyntaxNode | null | undefined): boolean => {
  if (!node) {
    return false;
  }

  const decisionNodeTypes = new Set<string>([
    "if_statement",
    "elif_clause",
    "for_statement",
    "for_in_statement",
    "while_statement",
    "do_statement",
    "case_clause",
    "switch_case",
    "catch_clause",
    "except_clause",
    "conditional_expression"
  ]);

  if (decisionNodeTypes.has(node.type)) {
    return true;
  }

  return node.type === "&&" || node.type === "||";
};

const countDecisionPoints = (root: SyntaxNode | null | undefined): number => {
  let count = 0;

  const walk = (node: SyntaxNode | null | undefined): void => {
    if (!node) {
      return;
    }

    if (shouldCountNode(node)) {
      count += 1;
    }

    for (const child of node.namedChildren) {
      if (!child) {
        continue;
      }
      walk(child);
    }
  };

  walk(root);
  return count;
};

const fallbackDecisionCount = (source: string): number =>
  source.match(/\bif\b|\belse\s+if\b|\bfor\b|\bwhile\b|\bdo\b|\bcase\b|\bcatch\b|\bexcept\b|\?|&&|\|\|/g)
    ?.length ?? 0;

export const scoreComplexity = (ast: ParsedFunction[]): ComplexityResult => {
  if (ast.length === 0) {
    return {
      functions: [],
      averageComplexity: 0,
      healthScore: 100
    };
  }

  const functionScores = ast.map((fn) => {
    const language = normalizeLanguage(fn.language);
    parser.setLanguage(resolveLanguage(language));
    const tree = parser.parse(fn.source);

    const astDecisionCount = countDecisionPoints(tree.rootNode);
    const complexity = 1 + Math.max(astDecisionCount, fallbackDecisionCount(fn.source));

    return {
      functionName: fn.name,
      startLine: fn.startLine,
      endLine: fn.endLine,
      complexity,
      band: bandForScore(complexity),
      weight: Math.max(1, fn.endLine - fn.startLine + 1)
    };
  });

  const totalWeight = functionScores.reduce((sum, score) => sum + score.weight, 0);
  const weightedComplexity = functionScores.reduce((sum, score) => sum + score.complexity * score.weight, 0);
  const averageComplexity = Number((weightedComplexity / totalWeight).toFixed(2));

  const healthScore = Number(
    Math.max(0, Math.min(100, 100 - (averageComplexity - 1) * 6.25)).toFixed(2)
  );

  return {
    functions: functionScores.map(({ weight, ...rest }) => rest),
    averageComplexity,
    healthScore
  };
};
