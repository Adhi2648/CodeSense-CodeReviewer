import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

interface ReviewRow {
  id: string;
  createdAt: string;
  language: string;
  status: string;
  healthScore: number | null;
  findings: unknown;
}

interface HistoryResponse {
  page: number;
  limit: number;
  total: number;
  reviews: ReviewRow[];
  trend: Array<{ date: string; healthScore: number; language: string }>;
}

const renderSparkline = (points: number[]): JSX.Element => {
  const width = 100;
  const height = 28;
  if (points.length < 2) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24">
      <path d={path} fill="none" stroke="#f97316" strokeWidth="2" />
    </svg>
  );
};

export const History = (): JSX.Element => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [language, setLanguage] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "health" | "language">("date");
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["history", page, limit, language, sortBy],
    queryFn: async () =>
      api.get<HistoryResponse>(
        `/api/history?page=${page}&limit=${limit}&sortBy=${sortBy}${language ? `&language=${language}` : ""}`
      )
  });

  const totalPages = useMemo(() => {
    const total = query.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [query.data?.total, limit]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Review History</h1>
        <div className="flex gap-2">
          <Select
            className="w-36"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "date" | "health" | "language")}
            options={[
              { label: "Sort: Date", value: "date" },
              { label: "Sort: Health", value: "health" },
              { label: "Sort: Language", value: "language" }
            ]}
          />
          <Select
            className="w-36"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            options={[
              { label: "All Languages", value: "" },
              { label: "JavaScript", value: "javascript" },
              { label: "TypeScript", value: "typescript" },
              { label: "Python", value: "python" }
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data?.reviews ?? []).map((review) => {
                const sparkline = (query.data?.trend ?? [])
                  .filter((item) => new Date(item.date) <= new Date(review.createdAt))
                  .slice(-10)
                  .map((item) => item.healthScore);
                return (
                  <Fragment key={review.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded((prev) => (prev === review.id ? null : review.id))}
                    >
                      <TableCell>{new Date(review.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{review.language}</TableCell>
                      <TableCell>{review.healthScore?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.status}</Badge>
                      </TableCell>
                      <TableCell>{renderSparkline(sparkline)}</TableCell>
                    </TableRow>
                    {expanded === review.id && (
                      <TableRow key={`${review.id}-expanded`}>
                        <TableCell colSpan={5}>
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                            {JSON.stringify(review.findings ?? [], null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
