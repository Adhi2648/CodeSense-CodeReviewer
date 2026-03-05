import { ParsedFunction } from "@codesense/shared";
import { chunkFunctions } from "./chunker";

describe("chunker", () => {
  it("splits large functions at 512 token boundaries with overlap", () => {
    const tokens = Array.from({ length: 1200 }, (_, index) => `token_${index}`).join(" ");
    const functions: ParsedFunction[] = [
      {
        name: "hugeFunction",
        startLine: 1,
        endLine: 200,
        source: tokens,
        parameters: [],
        isAsync: false,
        nestingDepth: 0,
        language: "javascript"
      }
    ];

    const chunks = chunkFunctions(functions);
    expect(chunks.length).toBeGreaterThan(1);
    const firstChunk = chunks[0];
    const secondChunk = chunks[1];
    expect(firstChunk).toBeDefined();
    expect(secondChunk).toBeDefined();
    if (!firstChunk || !secondChunk) {
      throw new Error("Expected at least two chunks for overlap validation");
    }
    expect(firstChunk.chunkCount).toBe(chunks.length);

    const firstTokens = firstChunk.code.split(/\s+/);
    const secondTokens = secondChunk.code.split(/\s+/);

    expect(firstTokens.length).toBeLessThanOrEqual(512);
    expect(secondTokens.length).toBeLessThanOrEqual(512);

    const overlapFromFirst = firstTokens.slice(-50);
    const overlapFromSecond = secondTokens.slice(0, 50);
    expect(overlapFromSecond).toEqual(overlapFromFirst);
  });
});
