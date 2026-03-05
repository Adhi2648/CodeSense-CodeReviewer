import { SearchResult } from "@codesense/shared";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

interface EmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

const toVectorLiteral = (values: number[]): string => `[${values.join(",")}]`;

const embedQuery = async (query: string): Promise<number[]> => {
  const response = await fetch(`${EMBEDDING_URL}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskType: "RETRIEVAL_QUERY",
      content: {
        parts: [{ text: query }]
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Query embedding failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const values = payload.embedding?.values;

  if (!values || values.length === 0) {
    throw new Error("Query embedding API returned empty vector");
  }

  return values;
};

type DbSearchRow = {
  id: string;
  functionName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
  complexity: number;
  similarity: number;
};

export const semanticSearch = async (
  query: string,
  repositoryId: string,
  topK: number
): Promise<SearchResult[]> => {
  const vector = await embedQuery(query);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT *,
             1 - (embedding <=> $1::vector) as similarity
      FROM "CodeChunk"
      WHERE "repositoryId" = $2
      ORDER BY similarity DESC
      LIMIT $3
    `,
    toVectorLiteral(vector),
    repositoryId,
    topK
  )) as DbSearchRow[];

  return rows.map((row: DbSearchRow) => ({
    id: row.id,
    functionName: row.functionName,
    filePath: row.filePath,
    startLine: row.startLine,
    endLine: row.endLine,
    code: row.code,
    language: row.language,
    complexity: row.complexity,
    similarity: Number(row.similarity)
  }));
};
