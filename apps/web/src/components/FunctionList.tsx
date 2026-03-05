import { ParsedFunction } from "@codesense/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunctionListProps {
  functions: ParsedFunction[];
  onSelect: (line: number) => void;
}

export const FunctionList = ({ functions, onSelect }: FunctionListProps): JSX.Element => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Parsed Functions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="max-h-[60vh] space-y-2 overflow-auto">
        {functions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Run a review to populate function list.</p>
        ) : (
          functions.map((fn) => (
            <button
              key={`${fn.name}-${fn.startLine}`}
              type="button"
              className="w-full rounded-md border border-border p-2 text-left text-sm hover:bg-muted"
              onClick={() => onSelect(fn.startLine)}
            >
              <div className="font-medium">{fn.name}</div>
              <div className="text-xs text-muted-foreground">
                lines {fn.startLine}-{fn.endLine} · {fn.parameters.length} params
              </div>
            </button>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);
