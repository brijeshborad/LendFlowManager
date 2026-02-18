import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down";
  trendValue?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function SummaryCard({
  title,
  value,
  subValue,
  trend,
  trendValue,
  icon: Icon,
  iconColor = "bg-primary",
}: SummaryCardProps) {
  return (
    <Card className="overflow-hidden" data-testid={`card-summary-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-mono tracking-tight mt-1.5 truncate">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            )}
            {trendValue && (
              <div className="flex items-center gap-1 mt-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend === "up" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend === "up" ? "↑" : "↓"} {trendValue}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconColor)}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
