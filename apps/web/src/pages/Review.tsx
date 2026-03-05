import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ParsedFunction, SearchResult } from "@codesense/shared";
import { CodeEditor } from "@/components/CodeEditor";
import { ComplexityChart } from "@/components/ComplexityChart";
import { DiffViewer } from "@/components/DiffViewer";
import { FunctionList } from "@/components/FunctionList";
import { HealthScore } from "@/components/HealthScore";
import { ReviewPanel } from "@/components/ReviewPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useReview } from "@/hooks/useReview";
import { api } from "@/lib/api";

interface ReviewRecord {
  id: string;
  repositoryId: string | null;
  findings: unknown;
  refactored: string | null;
  healthScore: number | null;
}

const DEFAULT_CODE = `function discount(cartTotal, member) {
  if (member && cartTotal > 100) {
    return cartTotal * 0.85;
  }
  return cartTotal;
}`;

const tabOptions = [
  { value: "review", label: "Review" },
  { value: "refactored", label: "Refactored" },
  { value: "complexity", label: "Complexity" },
  { value: "search", label: "Search" }
];

export const Review = (): JSX.Element => {
  const location = useLocation();
  const [code, setCode] = useState<string>(location.state?.sampleCode ?? DEFAULT_CODE);
  const [language, setLanguage] = useState<string>(location.state?.language ?? "javascript");
  const [activeTab, setActiveTab] = useState<string>("review");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [jumpToLine, setJumpToLine] = useState<number | null>(null);
  const { submitReview, reviewState, isStreaming } = useReview();

  const reviewDetailQuery = useQuery({
    queryKey: ["review", reviewState.reviewId],
    queryFn: async () => api.get<ReviewRecord>(`/api/review/${reviewState.reviewId}`),
    enabled: Boolean(reviewState.reviewId)
  });

  const parsedFunctions = useMemo<ParsedFunction[]>(
    () =>
      reviewState.complexity.map((item) => ({
        name: item.functionName,
        startLine: item.startLine,
        endLine: item.endLine,
        source: "",
        parameters: [],
        isAsync: false,
        nestingDepth: 0,
        language
      })),
    [reviewState.complexity, language]
  );

  const searchMutation = useMutation({
    mutationFn: async (payload: { query: string; repositoryId: string }) =>
      api.post<{ results: SearchResult[] }>("/api/search", payload),
    onSuccess: (data) => {
      setSearchResults(data.results);
    }
  });

  const runSearch = async (): Promise<void> => {
    if (!reviewDetailQuery.data?.repositoryId || !searchQuery.trim()) {
      return;
    }

    await searchMutation.mutateAsync({
      query: searchQuery,
      repositoryId: reviewDetailQuery.data.repositoryId
    });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Code Review</h1>
        <div className="flex gap-2">
          <Select
            className="w-44"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            options={[
              { label: "JavaScript", value: "javascript" },
              { label: "TypeScript", value: "typescript" },
              { label: "Python", value: "python" }
            ]}
          />
          <Button
            disabled={isStreaming}
            onClick={async () => {
              await submitReview({ code, language });
              setActiveTab("review");
            }}
          >
            {isStreaming ? "Reviewing..." : "Start Review"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <CodeEditor code={code} language={language} onChange={setCode} jumpToLine={jumpToLine} />
        <FunctionList
          functions={parsedFunctions}
          onSelect={(line) => {
            setJumpToLine(line);
          }}
        />
      </div>

      <Tabs value={activeTab} onChange={setActiveTab} options={tabOptions} />

      {activeTab === "review" && (
        <ReviewPanel
          progress={reviewState.progress}
          streamedText={reviewState.streamedText}
          findings={reviewState.findings}
        />
      )}

      {activeTab === "refactored" && (
        <div className="space-y-4">
          <DiffViewer original={code} refactored={reviewState.refactored} />
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>{reviewState.summary || "Summary will appear once review completes."}</CardContent>
          </Card>
        </div>
      )}

      {activeTab === "complexity" && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <ComplexityChart data={reviewState.complexity} />
          <HealthScore score={reviewState.healthScore ?? 0} />
        </div>
      )}

      {activeTab === "search" && (
        <Card>
          <CardHeader>
            <CardTitle>Semantic Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="find functions that handle authentication"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <Button onClick={runSearch}>Search</Button>
            </div>
            <div className="space-y-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-muted"
                  onClick={() => {
                    setJumpToLine(result.startLine);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{result.functionName}</p>
                    <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.filePath}:{result.startLine}-{result.endLine}
                  </p>
                </button>
              ))}
              {searchResults.length === 0 && <p className="text-sm text-muted-foreground">No matches yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
