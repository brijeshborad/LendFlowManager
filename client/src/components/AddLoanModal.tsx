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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2 } from "lucide-react";
import type { Borrower, FundHolder } from "@shared/schema";

interface AddLoanModalProps {
  open: boolean;
  onClose: () => void;
}

interface Disbursement {
  fundHolderId: string;
  amount: string;
}

export function AddLoanModal({ open, onClose }: AddLoanModalProps) {
  const { toast } = useToast();
  const [borrowerId, setBorrowerId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestRateType, setInterestRateType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });

  const { data: userSettings } = useQuery<any>({
    queryKey: ['/api/user/settings'],
  });

  const { data: fundHolders = [] } = useQuery<FundHolder[]>({
    queryKey: ['/api/fund-holders'],
    enabled: !!userSettings?.cashTrackingEnabled,
  });

  const cashTrackingEnabled = userSettings?.cashTrackingEnabled && fundHolders.length > 0;

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
    }
  }, [open]);

  const createLoanMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/loans", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loan created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-transactions/balances'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create loan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setBorrowerId("");
    setPrincipalAmount("");
    setInterestRate("");
    setInterestRateType("monthly");
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setDisbursements([]);
  };

  const addDisbursement = () => {
    setDisbursements([...disbursements, { fundHolderId: "", amount: "" }]);
  };

  const removeDisbursement = (index: number) => {
    setDisbursements(disbursements.filter((_, i) => i !== index));
  };

  const updateDisbursement = (index: number, field: keyof Disbursement, value: string) => {
    const updated = [...disbursements];
    updated[index] = { ...updated[index], [field]: value };
    setDisbursements(updated);
  };

  const disbursementTotal = disbursements.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const principalNum = parseFloat(principalAmount) || 0;
  const disbursementMismatch = disbursements.length > 0 && Math.abs(disbursementTotal - principalNum) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!borrowerId) {
      toast({ title: "Error", description: "Please select a borrower", variant: "destructive" });
      return;
    }

    if (disbursements.length > 0) {
      const incomplete = disbursements.some(d => !d.fundHolderId || !d.amount);
      if (incomplete) {
        toast({ title: "Error", description: "Fill all disbursement fields or remove empty rows", variant: "destructive" });
        return;
      }
      if (disbursementMismatch) {
        toast({ title: "Error", description: "Disbursement total must equal principal amount", variant: "destructive" });
        return;
      }
    }

    const selectedBorrower = borrowers.find(b => b.id === borrowerId);

    createLoanMutation.mutate({
      borrowerId,
      principalAmount,
      interestRate,
      interestRateType,
      startDate,
      disbursements: disbursements.length > 0 ? disbursements : undefined,
      _borrowerName: selectedBorrower?.name,
    });
  };

  const handleClose = () => {
    if (!createLoanMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-loan">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Enter loan details for the borrower
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3.5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="borrower" className="text-xs font-medium">Select Borrower *</Label>
              <Select
                value={borrowerId}
                onValueChange={setBorrowerId}
                disabled={createLoanMutation.isPending || borrowers.length === 0}
              >
                <SelectTrigger id="borrower" data-testid="select-borrower">
                  <SelectValue placeholder={borrowers.length === 0 ? "No borrowers available" : "Select a borrower"} />
                </SelectTrigger>
                <SelectContent>
                  {borrowers.map((borrower) => (
                    <SelectItem key={borrower.id} value={String(borrower.id)}>
                      {borrower.name} ({borrower.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {borrowers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Please add a borrower first before creating a loan
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="principal" className="text-xs font-medium">Principal Amount (₹) *</Label>
                <Input
                  id="principal"
                  type="number"
                  placeholder="100000"
                  required
                  min="1"
                  step="0.01"
                  className="font-mono"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  data-testid="input-principal-amount"
                  disabled={createLoanMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interest-rate" className="text-xs font-medium">Interest Rate (%) *</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  placeholder="12.5"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  className="font-mono"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  data-testid="input-interest-rate"
                  disabled={createLoanMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="interest-rate-type" className="text-xs font-medium">Interest Rate Type *</Label>
                <Select
                  value={interestRateType}
                  onValueChange={setInterestRateType}
                  disabled={createLoanMutation.isPending}
                >
                  <SelectTrigger id="interest-rate-type" data-testid="select-interest-rate-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs font-medium">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  required
                  className="h-10"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                  disabled={createLoanMutation.isPending}
                />
              </div>
            </div>

            {/* Disbursement section - only when cash tracking is enabled */}
            {cashTrackingEnabled && (
              <div className="space-y-2 border-t pt-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Fund Disbursement</Label>
                    <p className="text-[11px] text-muted-foreground">Which fund holders are disbursing this loan?</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDisbursement}
                    disabled={createLoanMutation.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {disbursements.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No disbursement tracking. Click "Add" to track which fund holders are providing the funds.
                  </p>
                )}

                {disbursements.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={d.fundHolderId}
                      onValueChange={(v) => updateDisbursement(i, "fundHolderId", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select fund holder" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundHolders.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      min="0.01"
                      step="0.01"
                      className="w-36 font-mono"
                      value={d.amount}
                      onChange={(e) => updateDisbursement(i, "amount", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => removeDisbursement(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {disbursements.length > 0 && (
                  <div className={`flex justify-between text-xs px-1 ${disbursementMismatch ? "text-red-600" : "text-muted-foreground"}`}>
                    <span>Disbursement total</span>
                    <span className="font-mono font-medium">
                      ₹{disbursementTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      {disbursementMismatch && ` (should be ₹${principalNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
              disabled={createLoanMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-submit-loan"
              disabled={createLoanMutation.isPending || borrowers.length === 0}
            >
              {createLoanMutation.isPending ? "Creating..." : "Create Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
