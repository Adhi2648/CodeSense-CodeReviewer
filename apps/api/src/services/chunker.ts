import { CodeChunk, ParsedFunction } from "@codesense/shared";

const MAX_TOKENS_PER_CHUNK = 512;
const TOKEN_OVERLAP = 50;

const tokenize = (source: string): string[] => {
  const matches = source.match(/[A-Za-z_][A-Za-z0-9_]*|[^\s]/g);
  return matches ?? [];
};

const estimateComplexity = (source: string): number => {
  const decisionPattern =
    /\bif\b|\belse\s+if\b|\bfor\b|\bwhile\b|\bdo\b|\bcase\b|\bcatch\b|\&\&|\|\||\?/g;
  const matches = source.match(decisionPattern);
  return 1 + (matches?.length ?? 0);
};

const toChunkCode = (tokens: string[]): string => tokens.join(" ");

export const chunkFunctions = (functions: ParsedFunction[]): CodeChunk[] => {
  const chunks: CodeChunk[] = [];

  for (const fn of functions) {
    const tokens = tokenize(fn.source);
    const complexity = estimateComplexity(fn.source);
    const filePath = fn.filePath ?? "inline://snippet";

    if (tokens.length <= MAX_TOKENS_PER_CHUNK) {
      chunks.push({
        functionName: fn.name,
        filePath,
        startLine: fn.startLine,
        endLine: fn.endLine,
        code: fn.source,
        language: fn.language,
        complexity,
        chunkIndex: 0,
        chunkCount: 1
      });
      continue;
    }

    const functionChunks: CodeChunk[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + MAX_TOKENS_PER_CHUNK, tokens.length);
      const slice = tokens.slice(start, end);

      functionChunks.push({
        functionName: fn.name,
        filePath,
        startLine: fn.startLine,
        endLine: fn.endLine,
        code: toChunkCode(slice),
        language: fn.language,
        complexity,
        chunkIndex: functionChunks.length,
        chunkCount: 0
      });

      if (end === tokens.length) {
        break;
      }
      start = Math.max(0, end - TOKEN_OVERLAP);
    }

    for (const chunk of functionChunks) {
      chunk.chunkCount = functionChunks.length;
      chunks.push(chunk);
    }
  }

  return chunks;
};
