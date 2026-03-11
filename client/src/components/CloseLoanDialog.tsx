import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, AlertTriangle } from "lucide-react";
import type { Loan } from "@shared/schema";

interface CloseLoanDialogProps {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  outstandingPrincipal: number;
  pendingInterest: number;
}

export function CloseLoanDialog({
  open,
  onClose,
  loan,
  outstandingPrincipal,
  pendingInterest,
}: CloseLoanDialogProps) {
  const { toast } = useToast();
  const [settlementNotes, setSettlementNotes] = useState("");

  const totalOutstanding = outstandingPrincipal + pendingInterest;
  const hasOutstanding = totalOutstanding > 0.01;

  const closeMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (hasOutstanding) {
        body.settlementAmount = totalOutstanding.toFixed(2);
        body.settlementNotes = settlementNotes || `Settled outstanding: Principal ₹${outstandingPrincipal.toFixed(2)}, Interest ₹${pendingInterest.toFixed(2)}`;
      }
      const response = await apiRequest("POST", `/api/loans/${loan!.id}/close`, body);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Loan Closed",
        description: hasOutstanding
          ? `Loan settled with ₹${totalOutstanding.toFixed(2)} written off`
          : "Loan has been closed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interest/real-time"] });
      setSettlementNotes("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close loan",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleClose = () => {
    if (!closeMutation.isPending) {
      setSettlementNotes("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasOutstanding ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Close Loan
          </DialogTitle>
          <DialogDescription>
            {!hasOutstanding
              ? "All dues are cleared. This loan can be closed."
              : "This loan has outstanding amounts that will be settled."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasOutstanding ? (
            <p className="text-green-600 font-medium text-sm">
              Principal and interest are fully paid. Ready to close.
            </p>
          ) : (
            <>
              <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>Outstanding Principal</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {formatCurrency(outstandingPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending Interest</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {formatCurrency(pendingInterest)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 font-medium">
                  <span>Total to Settle</span>
                  <span className="font-mono font-bold text-red-600">
                    {formatCurrency(totalOutstanding)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Settlement
                </Badge>
                <span className="text-xs text-muted-foreground">
                  This amount will be written off
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Settlement Notes (optional)</Label>
                <Textarea
                  placeholder="Reason for settlement..."
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="h-20 text-sm"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={closeMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className={hasOutstanding ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
          >
            {closeMutation.isPending
              ? "Closing..."
              : hasOutstanding
                ? "Settle & Close Loan"
                : "Close Loan"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
