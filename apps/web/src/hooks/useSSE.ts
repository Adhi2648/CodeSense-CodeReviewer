import { useEffect, useMemo, useState } from "react";
import { Finding, ReviewResult } from "@codesense/shared";

interface ProgressEvent {
  step: string;
  percent: number;
}

type StreamStatus = "idle" | "connecting" | "streaming" | "completed" | "error";

interface UseSseResult {
  tokens: string[];
  findings: Finding[];
  progress: ProgressEvent;
  status: StreamStatus;
  error: string | null;
  complete: ReviewResult | null;
}

const defaultProgress: ProgressEvent = { step: "idle", percent: 0 };

export const useSSE = (reviewId: string | null, enabled: boolean): UseSseResult => {
  const [tokens, setTokens] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [progress, setProgress] = useState<ProgressEvent>(defaultProgress);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState<ReviewResult | null>(null);

  useEffect(() => {
    if (!reviewId || !enabled) {
      return;
    }

    let eventSource: EventSource | null = null;
    let retries = 0;
    let stopped = false;

    const connect = (): void => {
      if (stopped) {
        return;
      }

      setStatus("connecting");
      eventSource = new EventSource(`/api/review/${reviewId}/stream`, { withCredentials: true });

      eventSource.addEventListener("progress", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as ProgressEvent;
        setProgress(payload);
        setStatus(payload.percent >= 100 ? "completed" : "streaming");
      });

      eventSource.addEventListener("token", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as { text: string };
        setTokens((previous) => [...previous, payload.text]);
        setStatus("streaming");
      });

      eventSource.addEventListener("findings", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as Finding[];
        setFindings(payload);
      });

      eventSource.addEventListener("complete", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as ReviewResult;
        setComplete(payload);
        setStatus("completed");
        eventSource?.close();
      });

      eventSource.addEventListener("error", (event) => {
        if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
          return;
        }
        try {
          const payload = JSON.parse(event.data) as { message?: string };
          setError(payload.message ?? "Review stream failed");
          setStatus("error");
        } catch {
          setError("Review stream failed");
          setStatus("error");
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (retries >= 3) {
          setStatus("error");
          setError("Could not reconnect to review stream");
          return;
        }
        retries += 1;
        setTimeout(connect, retries * 1000);
      };
    };

    connect();

    return () => {
      stopped = true;
      eventSource?.close();
    };
  }, [enabled, reviewId]);

  return useMemo(
    () => ({
      tokens,
      findings,
      progress,
      status,
      error,
      complete
    }),
    [tokens, findings, progress, status, error, complete]
  );
};
