import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Borrower, Loan } from "@shared/schema";

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedBorrowerId?: string | null;
  loanId?: string;
}

export function AddPaymentModal({
  open,
  onClose,
  preSelectedBorrowerId,
  loanId: preSelectedLoanId,
}: AddPaymentModalProps) {
  const { toast } = useToast();
  const [borrowerId, setBorrowerId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Fetch borrowers
  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
    enabled: open,
  });

  // Fetch loans for selected borrower
  const { data: allLoans = [] } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
    enabled: open,
  });

  const borrowerLoans = allLoans.filter(loan => loan.borrowerId === borrowerId);

  // Set pre-selected borrower and loan when modal opens
  useEffect(() => {
    if (open && preSelectedLoanId) {
      const loan = allLoans.find(l => l.id === preSelectedLoanId);
      if (loan) {
        setBorrowerId(loan.borrowerId);
        setLoanId(preSelectedLoanId);
      }
    } else if (open && preSelectedBorrowerId) {
      setBorrowerId(preSelectedBorrowerId);
      setLoanId("");
    } else if (open) {
      setBorrowerId("");
      setLoanId("");
    }
  }, [open, preSelectedBorrowerId, preSelectedLoanId, allLoans]);

  // Reset loan when borrower changes (only if no pre-selected loan)
  useEffect(() => {
    if (!preSelectedLoanId) {
      setLoanId("");
    }
  }, [borrowerId, preSelectedLoanId]);

  const addPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Payment added",
        description: "The payment has been recorded successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!borrowerId || !loanId) {
      toast({
        title: "Error",
        description: "Please select both borrower and loan",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData(e.target as HTMLFormElement);
    const amount = formData.get("amount")?.toString();
    const paymentDate = formData.get("payment-date")?.toString();
    
    if (!amount || !paymentDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    addPaymentMutation.mutate({
      loanId,
      amount,
      paymentDate,
      paymentType,
      paymentMethod,
      transactionReference: formData.get("reference")?.toString() || null,
      notes: formData.get("notes")?.toString() || null,
      interestClearedTillDate: formData.get("interest-cleared-till")?.toString() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-add-payment">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a new payment from a borrower
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrower">Borrower</Label>
                <Select value={borrowerId} onValueChange={setBorrowerId} required>
                  <SelectTrigger id="borrower" data-testid="select-borrower">
                    <SelectValue placeholder="Select borrower" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowers.map((borrower) => (
                      <SelectItem key={borrower.id} value={borrower.id}>
                        {borrower.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan">Loan</Label>
                <Select value={loanId} onValueChange={setLoanId} required>
                  <SelectTrigger id="loan" data-testid="select-loan">
                    <SelectValue placeholder="Select loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowerLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        ₹{parseFloat(loan.principalAmount).toLocaleString()} @ {loan.interestRate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  name="payment-date"
                  type="date"
                  required
                  data-testid="input-payment-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="50000"
                  required
                  className="font-mono"
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType} required>
                  <SelectTrigger id="payment-type" data-testid="select-payment-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal Repayment</SelectItem>
                    <SelectItem value="interest">Interest Payment</SelectItem>
                    <SelectItem value="partial-interest">Partial Interest</SelectItem>
                    <SelectItem value="mixed">Mixed (Principal + Interest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger id="payment-method" data-testid="select-payment-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Transaction Reference (Optional)</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="UPI ID, Cheque number, etc."
                data-testid="input-reference"
              />
            </div>

            {(paymentType === 'interest' || paymentType === 'partial-interest') && (
              <div className="space-y-2">
                <Label htmlFor="interest-cleared-till">Interest Cleared Till Date *</Label>
                <Input
                  id="interest-cleared-till"
                  name="interest-cleared-till"
                  type="date"
                  required
                  data-testid="input-interest-cleared-till"
                />
                <p className="text-xs text-muted-foreground">
                  Specify till which date the interest is cleared with this payment
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional remarks about this payment..."
                rows={3}
                data-testid="textarea-notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Receipt (Optional)</Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center hover-elevate cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or PDF up to 10MB
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={addPaymentMutation.isPending} data-testid="button-submit-payment">
              {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
