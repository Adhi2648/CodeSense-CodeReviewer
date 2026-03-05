import ReactDiffViewer from "react-diff-viewer-continued";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiffViewerProps {
  original: string;
  refactored: string;
}

export const DiffViewer = ({ original, refactored }: DiffViewerProps): JSX.Element => (
  <Card>
    <CardHeader>
      <CardTitle>Before / After Diff</CardTitle>
    </CardHeader>
    <CardContent>
      <ReactDiffViewer
        oldValue={original}
        newValue={refactored || "// Refactored output will appear here"}
        splitView
        showDiffOnly={false}
        useDarkTheme={false}
      />
    </CardContent>
  </Card>
);
