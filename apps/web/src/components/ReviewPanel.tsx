import { Finding } from "@codesense/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { severityColor } from "@/lib/utils";

interface ReviewPanelProps {
  progress: {
    step: string;
    percent: number;
  };
  streamedText: string;
  findings: Finding[];
}

export const ReviewPanel = ({ progress, streamedText, findings }: ReviewPanelProps): JSX.Element => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Review Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progress.percent} />
        <p className="text-sm text-muted-foreground">
          Step: <span className="font-medium text-foreground">{progress.step}</span> ({progress.percent}%)
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Streaming Output</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
          {streamedText || "Streaming review output will appear here..."}
        </pre>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet.</p>
        ) : (
          findings.map((finding, index) => (
            <div key={`${finding.line}-${index}`} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={severityColor(finding.severity)}>{finding.severity}</Badge>
                  <Badge variant="outline">{finding.type}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">Line {finding.line}</span>
              </div>
              <p className="text-sm">{finding.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Suggestion: {finding.suggestion}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  </div>
);
