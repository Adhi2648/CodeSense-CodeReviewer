import { CodeChunk } from "@codesense/shared";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
const BATCH_SIZE = 20;

interface EmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toEmbeddingInput = (chunk: CodeChunk): string =>
  [
    `Function: ${chunk.functionName}`,
    `File: ${chunk.filePath}`,
    `Language: ${chunk.language}`,
    `Complexity: ${chunk.complexity}`,
    `Chunk: ${chunk.chunkIndex + 1}/${chunk.chunkCount}`,
    "Code:",
    chunk.code
  ].join("\n");

const requestEmbedding = async (text: string, attempt = 1): Promise<number[]> => {
  const response = await fetch(`${EMBEDDING_URL}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskType: "RETRIEVAL_DOCUMENT",
      content: {
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    if (attempt < 3) {
      const delay = 2 ** attempt * 1000;
      await sleep(delay);
      return requestEmbedding(text, attempt + 1);
    }
    const body = await response.text();
    throw new Error(`Embedding API failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const values = payload.embedding?.values;

  if (!values || values.length === 0) {
    throw new Error("Embedding API returned empty vector");
  }

  return values;
};

const toVectorLiteral = (values: number[]): string => `[${values.join(",")}]`;

export const embedChunks = async (chunks: CodeChunk[]): Promise<void> => {
  for (let index = 0; index < chunks.length; index += BATCH_SIZE) {
    const batch = chunks.slice(index, index + BATCH_SIZE);

    const embeddings = await Promise.all(
      batch.map(async (chunk) => requestEmbedding(toEmbeddingInput(chunk)))
    );

    for (let chunkIndex = 0; chunkIndex < batch.length; chunkIndex += 1) {
      const chunk = batch[chunkIndex];
      const embedding = embeddings[chunkIndex];

      if (!chunk.repositoryId) {
        throw new Error("Cannot store code chunks without repositoryId");
      }

      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "CodeChunk"
          ("repositoryId", "functionName", "filePath", "startLine", "endLine", "code", "language", "complexity", "embedding")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
        `,
        chunk.repositoryId,
        chunk.functionName,
        chunk.filePath,
        chunk.startLine,
        chunk.endLine,
        chunk.code,
        chunk.language,
        chunk.complexity,
        toVectorLiteral(embedding)
      );
    }

    logger.info({ batchStart: index, batchSize: batch.length }, "Stored code chunk embeddings");
  }
};
