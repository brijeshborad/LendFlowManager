import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface InterestChartProps {
  title: string;
  data: Array<{
    month: string;
    received: number;
    pending: number;
  }>;
  onExport?: () => void;
}

export function InterestChart({ title, data, onExport }: InterestChartProps) {
  return (
    <Card data-testid="card-interest-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="button-timerange-1m"
              >
                1M
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="button-timerange-3m"
              >
                3M
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs"
                data-testid="button-timerange-6m"
              >
                6M
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                data-testid="button-timerange-1y"
              >
                1Y
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              data-testid="button-export-chart"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.375rem",
              }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="received"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Interest Received"
              dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              name="Interest Pending"
              dot={{ fill: "hsl(var(--chart-4))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
