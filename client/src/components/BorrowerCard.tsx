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
    <Card className="hover-elevate" data-testid={`card-borrower-${id}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold">{name}</h3>
                <div className="flex flex-col gap-0.5 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{phone}</span>
                  </div>
                </div>
              </div>
              <Badge className={cn("text-xs", getStatusColor())}>
                {status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-muted rounded-md">
              <div>
                <p className="text-xs text-muted-foreground">Total Lent</p>
                <p className="text-base font-semibold font-mono">{totalLent}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-base font-semibold font-mono text-orange-600">{outstanding}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest Earned</p>
                <p className="text-base font-semibold font-mono text-green-600">{interestEarned}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Interest</p>
                <p className="text-base font-semibold font-mono text-red-600">{pendingInterest}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-base font-semibold font-mono text-blue-600">{totalPaid}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{paymentCount} payment{paymentCount !== 1 ? 's' : ''}</p>
              </div>
              {interestClearedTillDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Interest Cleared Till</p>
                  <p className="text-base font-semibold font-mono text-purple-600">{interestClearedTillDate}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onViewDetails?.(id)}
                data-testid={`button-view-${id}`}
              >
                <Eye className="h-4 w-4 mr-1.5" />
                View Details
              </Button>
              <Button 
                size="sm" 
                onClick={() => onAddPayment?.(id)}
                data-testid={`button-add-payment-${id}`}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Payment
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => onSendReminder?.(id)}
                data-testid={`button-send-reminder-${id}`}
              >
                <Send className="h-4 w-4 mr-1.5" />
                Send Reminder
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
