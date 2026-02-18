import { Phone, Mail, Eye, Plus, Send, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BorrowerCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  totalLent: string;
  outstanding: string;
  interestEarned: string;
  pendingInterest: string;
  totalPaid: string;
  paymentCount: number;
  lastPayment?: {
    date: string;
    amount: string;
  };
  daysSincePayment: number;
  interestClearedTillDate?: string;
  status: "active" | "overdue" | "settled";
  onViewDetails?: (borrowerId: string) => void;
  onAddPayment?: (borrowerId: string) => void;
  onSendReminder?: (borrowerId: string) => void;
}

export function BorrowerCard({
  id,
  name,
  email,
  phone,
  avatar,
  totalLent,
  outstanding,
  interestEarned,
  pendingInterest,
  totalPaid,
  paymentCount,
  lastPayment,
  daysSincePayment,
  interestClearedTillDate,
  status,
  onViewDetails,
  onAddPayment,
  onSendReminder,
}: BorrowerCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    switch (status) {
      case "overdue":
        return "bg-red-500";
      case "settled":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card className="hover-elevate overflow-hidden" data-testid={`card-borrower-${id}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{name}</h3>
              <Badge className={cn("text-[10px] shrink-0", getStatusColor())}>
                {status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {email}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <Phone className="h-3 w-3" />
                {phone}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/60 rounded-lg mb-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Lent</p>
            <p className="text-sm font-semibold font-mono mt-0.5">{totalLent}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
            <p className="text-sm font-semibold font-mono text-orange-600 mt-0.5">{outstanding}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Pending Int.</p>
            <p className="text-sm font-semibold font-mono text-red-600 mt-0.5">{pendingInterest}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Int. Earned</p>
            <p className="text-sm font-semibold font-mono text-green-600 mt-0.5">{interestEarned}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Paid</p>
            <p className="text-sm font-semibold font-mono text-blue-600 mt-0.5">{totalPaid}</p>
            <p className="text-[10px] text-muted-foreground">{paymentCount} payment{paymentCount !== 1 ? 's' : ''}</p>
          </div>
          {interestClearedTillDate && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cleared Till</p>
              <p className="text-sm font-semibold font-mono text-purple-600 mt-0.5">{interestClearedTillDate}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewDetails?.(id)}
            data-testid={`button-view-${id}`}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onAddPayment?.(id)}
            data-testid={`button-add-payment-${id}`}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Payment
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 h-8 text-xs"
            onClick={() => onSendReminder?.(id)}
            data-testid={`button-send-reminder-${id}`}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Remind
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
