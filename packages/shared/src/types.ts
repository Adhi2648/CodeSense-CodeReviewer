export enum ReviewStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export type FindingType = "bug" | "security" | "performance" | "smell";
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface Finding {
  type: FindingType;
  severity: FindingSeverity;
  line: number;
  description: string;
  suggestion: string;
}

export interface ParsedFunction {
  name: string;
  startLine: number;
  endLine: number;
  source: string;
  filePath?: string;
  parameters: string[];
  isAsync: boolean;
  nestingDepth: number;
  language: string;
}

export type ComplexityBand = "simple" | "moderate" | "complex" | "very complex";

export interface FunctionComplexityScore {
  functionName: string;
  startLine: number;
  endLine: number;
  complexity: number;
  band: ComplexityBand;
}

export interface ComplexityResult {
  functions: FunctionComplexityScore[];
  averageComplexity: number;
  healthScore: number;
}

export interface CodeChunk {
  id?: string;
  repositoryId?: string;
  functionName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
  complexity: number;
  chunkIndex: number;
  chunkCount: number;
}

export interface SearchResult {
  id: string;
  functionName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
  complexity: number;
  similarity: number;
}

export interface ReviewResult {
  findings: Finding[];
  refactored: string;
  summary: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface ReviewJob {
  reviewId: string;
  code: string;
  language: string;
  userId: string;
  repositoryId?: string;
}

export interface ApiErrorShape {
  error: string;
  code: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorShape;
}
