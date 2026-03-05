import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

interface ReviewItem {
  id: string;
  language: string;
  status: string;
  healthScore: number | null;
  createdAt: string;
  repositoryId: string | null;
}

interface HistoryResponse {
  reviews: ReviewItem[];
  trend: Array<{
    date: string;
    healthScore: number;
    language: string;
  }>;
}

const pieColors = ["#f97316", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"];

export const Dashboard = (): JSX.Element => {
  const historyQuery = useQuery({
    queryKey: ["dashboard", "history"],
    queryFn: async () => api.get<HistoryResponse>("/api/history?page=1&limit=50")
  });

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const review of historyQuery.data?.reviews ?? []) {
      map.set(review.language, (map.get(review.language) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [historyQuery.data?.reviews]);

  const repositories = useMemo(() => {
    const set = new Set<string>();
    for (const review of historyQuery.data?.reviews ?? []) {
      if (review.repositoryId) {
        set.add(review.repositoryId);
      }
    }
    return Array.from(set);
  }, [historyQuery.data?.reviews]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Health Score Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyQuery.data?.trend ?? []}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="healthScore" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews by Language</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(historyQuery.data?.reviews ?? []).slice(0, 8).map((review) => (
                <TableRow key={review.id}>
                  <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{review.language}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{review.status}</Badge>
                  </TableCell>
                  <TableCell>{review.healthScore?.toFixed(1) ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Repositories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {repositories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repositories linked yet.</p>
          ) : (
            repositories.map((repoId) => (
              <div key={repoId} className="rounded-md border border-border p-2 text-sm">
                {repoId}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
