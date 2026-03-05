import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FunctionComplexityScore } from "@codesense/shared";
import { complexityColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplexityChartProps {
  data: FunctionComplexityScore[];
}

export const ComplexityChart = ({ data }: ComplexityChartProps): JSX.Element => (
  <Card>
    <CardHeader>
      <CardTitle>Function Complexity</CardTitle>
    </CardHeader>
    <CardContent className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="functionName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="complexity">
            {data.map((item) => (
              <Cell key={`${item.functionName}-${item.startLine}`} fill={complexityColor(item.complexity)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);
