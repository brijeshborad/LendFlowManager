import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Payment, FundHolder } from "@shared/schema";

interface EditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: (Payment & { collectedByFundHolderId?: string | null }) | null;
}

export function EditPaymentModal({ open, onClose, payment }: EditPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [interestClearedTillDate, setInterestClearedTillDate] = useState("");
  const [collectedByFundHolderId, setCollectedByFundHolderId] = useState("");

  const { data: userSettings } = useQuery<any>({
    queryKey: ['/api/user/settings'],
    enabled: open,
  });
  const { data: fundHolders = [] } = useQuery<FundHolder[]>({
    queryKey: ['/api/fund-holders'],
    enabled: open && userSettings?.cashTrackingEnabled,
  });

  const showCollectedBy = userSettings?.cashTrackingEnabled && fundHolders.length > 0;

  useEffect(() => {
    if (payment && open) {
      setAmount(payment.amount.toString());
      setPaymentDate(new Date(payment.paymentDate).toISOString().split('T')[0]);
      setPaymentType(payment.paymentType);
      setPaymentMethod(payment.paymentMethod);
      setTransactionReference(payment.transactionReference || "");
      setNotes(payment.notes || "");
      setInterestClearedTillDate(
        (payment as any).interestClearedTillDate
          ? new Date((payment as any).interestClearedTillDate).toISOString().split('T')[0]
          : ""
      );
      setCollectedByFundHolderId((payment as any).collectedByFundHolderId || "");
    }
  }, [payment, open]);

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!payment) throw new Error("No payment selected");
      const response = await apiRequest("PATCH", `/api/payments/${payment.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-transactions/balances'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updatePaymentMutation.mutate({
      amount,
      paymentDate,
      paymentType,
      paymentMethod,
      transactionReference: transactionReference || null,
      notes: notes || null,
      interestClearedTillDate: interestClearedTillDate || null,
      collectedByFundHolderId: (collectedByFundHolderId && collectedByFundHolderId !== "none") ? collectedByFundHolderId : null,
    });
  };

  const handleClose = () => {
    if (!updatePaymentMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update payment details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3.5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount" className="text-xs font-medium">Amount (₹) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  required
                  className="font-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={updatePaymentMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-payment-date" className="text-xs font-medium">Payment Date *</Label>
                <Input
                  id="edit-payment-date"
                  type="date"
                  required
                  className="h-10"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={updatePaymentMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-type" className="text-xs font-medium">Payment Type *</Label>
              <Select
                value={paymentType}
                onValueChange={setPaymentType}
                disabled={updatePaymentMutation.isPending}
              >
                <SelectTrigger id="edit-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal Repayment</SelectItem>
                  <SelectItem value="interest">Interest Payment</SelectItem>
                  <SelectItem value="partial_interest">Partial Interest</SelectItem>
                  <SelectItem value="mixed">Mixed (Principal + Interest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-method" className="text-xs font-medium">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={updatePaymentMutation.isPending}
              >
                <SelectTrigger id="edit-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-reference" className="text-xs font-medium">Transaction Reference</Label>
              <Input
                id="edit-reference"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                disabled={updatePaymentMutation.isPending}
              />
            </div>

            {(paymentType === 'interest' || paymentType === 'partial_interest') && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-interest-cleared-till" className="text-xs font-medium">Interest Cleared Till Date *</Label>
                <Input
                  id="edit-interest-cleared-till"
                  type="date"
                  required
                  className="h-10"
                  value={interestClearedTillDate}
                  onChange={(e) => setInterestClearedTillDate(e.target.value)}
                  disabled={updatePaymentMutation.isPending}
                />
              </div>
            )}

            {showCollectedBy && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Collected By (Fund Holder)</Label>
                <Select
                  value={collectedByFundHolderId}
                  onValueChange={setCollectedByFundHolderId}
                  disabled={updatePaymentMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund holder (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {fundHolders.map((fh: FundHolder) => (
                      <SelectItem key={fh.id} value={fh.id}>{fh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes" className="text-xs font-medium">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={updatePaymentMutation.isPending}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updatePaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updatePaymentMutation.isPending}
            >
              {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
