import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Finding, FunctionComplexityScore } from "@codesense/shared";
import { api } from "@/lib/api";
import { useSSE } from "./useSSE";

interface SubmitPayload {
  code: string;
  language: string;
}

interface SubmitResponse {
  reviewId: string;
  jobId: string;
}

interface ReviewState {
  reviewId: string | null;
  findings: Finding[];
  progress: {
    step: string;
    percent: number;
  };
  streamedText: string;
  refactored: string;
  summary: string;
  healthScore: number | null;
  complexity: FunctionComplexityScore[];
  error: string | null;
}

interface UseReviewResult {
  submitReview: (payload: SubmitPayload) => Promise<void>;
  reviewState: ReviewState;
  isStreaming: boolean;
  reset: () => void;
}

export const useReview = (): UseReviewResult => {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const stream = useSSE(reviewId, isStreaming);

  const mutation = useMutation({
    mutationFn: async (payload: SubmitPayload): Promise<SubmitResponse> =>
      api.post<SubmitResponse>("/api/review", payload)
  });

  const submitReview = async (payload: SubmitPayload): Promise<void> => {
    const response = await mutation.mutateAsync(payload);
    setReviewId(response.reviewId);
    setIsStreaming(true);
  };

  useEffect(() => {
    if (stream.status === "completed" || stream.status === "error") {
      setIsStreaming(false);
    }
  }, [stream.status]);

  const reviewState = useMemo<ReviewState>(() => {
    const completePayload = stream.complete as
      | (Record<string, unknown> & {
          refactored?: string;
          summary?: string;
          healthScore?: number;
          complexity?: FunctionComplexityScore[];
        })
      | null;

    return {
      reviewId,
      findings: stream.findings,
      progress: stream.progress,
      streamedText: stream.tokens.join(""),
      refactored: completePayload?.refactored ?? "",
      summary: completePayload?.summary ?? "",
      healthScore: completePayload?.healthScore ?? null,
      complexity: completePayload?.complexity ?? [],
      error: mutation.error instanceof Error ? mutation.error.message : stream.error
    };
  }, [
    mutation.error,
    reviewId,
    stream.complete,
    stream.error,
    stream.findings,
    stream.progress,
    stream.tokens
  ]);

  const reset = (): void => {
    setIsStreaming(false);
    setReviewId(null);
    mutation.reset();
  };

  return {
    submitReview,
    reviewState,
    isStreaming,
    reset
  };
};
