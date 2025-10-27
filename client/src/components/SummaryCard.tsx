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
    <Card data-testid={`card-summary-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold font-mono tracking-tight mt-2">{value}</p>
            {subValue && (
              <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
            )}
            {trendValue && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend === "up" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend === "up" ? "↑" : "↓"} {trendValue}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", iconColor)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
