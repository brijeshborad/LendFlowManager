import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "payment" | "alert" | "reminder" | "system";
  title: string;
  description: string;
  amount?: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "payment":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "reminder":
        return <Mail className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: Activity["type"]) => {
    switch (type) {
      case "payment":
        return "Payment";
      case "alert":
        return "Alert";
      case "reminder":
        return "Reminder";
      default:
        return "System";
    }
  };

  return (
    <Card className="flex flex-col h-full" data-testid="card-activity-feed">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
        <div className="space-y-4 pr-2">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "flex gap-4 pb-4",
                index !== activities.length - 1 && "border-b"
              )}
              data-testid={`activity-${activity.id}`}
            >
              <div className="flex-shrink-0 mt-1">{getIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {getTypeLabel(activity.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                  {activity.amount && (
                    <span className="text-sm font-semibold font-mono text-green-600">
                      {activity.amount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
