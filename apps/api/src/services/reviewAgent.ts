import { Response } from "express";
import { z } from "zod";
import { Finding, ReviewResult } from "@codesense/shared";
import { env } from "../config/env.js";

const GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
const STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:streamGenerateContent`;

const findingSchema = z.object({
  type: z.enum(["bug", "security", "performance", "smell"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  line: z.number().int().nonnegative(),
  description: z.string(),
  suggestion: z.string()
});

const findingsSchema = z.array(findingSchema);

interface ProviderGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const extractText = (payload: ProviderGenerateResponse): string => {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
};

const generateText = async (system: string, prompt: string, expectJson: boolean): Promise<string> => {
  const response = await fetch(`${GENERATE_URL}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: expectJson ? { responseMimeType: "application/json" } : undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Content generation failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as ProviderGenerateResponse;
  return extractText(payload);
};

const streamText = async (
  system: string,
  prompt: string,
  onToken: (token: string) => void
): Promise<string> => {
  const response = await fetch(`${STREAM_URL}?alt=sse&key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(`Content stream failed: ${response.status} ${body}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.replace(/^data:\s*/, "");
      if (data === "[DONE]" || data.length === 0) {
        continue;
      }

      const payload = JSON.parse(data) as ProviderGenerateResponse;
      const token = extractText(payload);
      if (token.length > 0) {
        onToken(token);
        fullText += token;
      }
    }
  }

  return fullText;
};

const cleanJsonFence = (text: string): string =>
  text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const runReviewAgentInternal = async (
  code: string,
  language: string,
  onToken: (token: string) => void
): Promise<ReviewResult> => {
  const analyzeSystem = "You are a senior staff engineer doing code review.";
  const analyzePrompt = [
    "Analyze this code for: (1) bugs and logic errors, (2) security vulnerabilities,",
    "(3) performance bottlenecks, (4) code smells. For each finding output JSON:",
    "{ type: 'bug'|'security'|'performance'|'smell', severity: 'low'|'medium'|'high'|'critical',",
    "  line: number, description: string, suggestion: string }",
    `Language: ${language}`,
    "Code:",
    code
  ].join("\n");

  const findingsRaw = await generateText(analyzeSystem, analyzePrompt, true);
  const findings = findingsSchema.parse(JSON.parse(cleanJsonFence(findingsRaw))) as Finding[];

  const refactorSystem = "You are an expert at writing clean, production-grade code.";
  const refactorPrompt = [
    `Given these findings: ${JSON.stringify(findings)}`,
    "rewrite the following code fixing all critical and high severity issues.",
    "Preserve the original logic. Output ONLY the refactored code with inline comments explaining each change.",
    `Language: ${language}`,
    "Code:",
    code
  ].join("\n");

  const refactored = await streamText(refactorSystem, refactorPrompt, onToken);

  const summarizeSystem = "You are a tech lead writing a code review summary.";
  const summarizePrompt = [
    "Given the original code, findings, and refactored version, write a concise",
    "review summary (3-5 sentences) that a developer would find actionable.",
    "Original code:",
    code,
    `Findings: ${JSON.stringify(findings)}`,
    "Refactored:",
    refactored
  ].join("\n");

  onToken("\n\nSummary:\n");
  const summary = await streamText(summarizeSystem, summarizePrompt, onToken);

  return {
    findings,
    refactored,
    summary
  };
};

const writeSse = (res: Response, type: string, data: unknown): void => {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const runReviewAgentWithStream = async (
  code: string,
  language: string,
  onToken: (token: string) => void
): Promise<ReviewResult> => runReviewAgentInternal(code, language, onToken);

export const runReviewAgent = async (
  code: string,
  language: string,
  res: Response
): Promise<ReviewResult> => {
  const result = await runReviewAgentInternal(code, language, (token) => {
    writeSse(res, "token", { text: token });
  });

  writeSse(res, "findings", result.findings);
  writeSse(res, "complete", result);
  return result;
};
