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
import type { Borrower } from "@shared/schema";

interface AddLoanModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddLoanModal({ open, onClose }: AddLoanModalProps) {
  const { toast } = useToast();
  const [borrowerId, setBorrowerId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestRateType, setInterestRateType] = useState("monthly");
  const [startDate, setStartDate] = useState("");

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
    }
  }, [open]);

  const createLoanMutation = useMutation({
    mutationFn: async (data: {
      borrowerId: string;
      principalAmount: string;
      interestRate: string;
      interestRateType: string;
      startDate: string;
    }) => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!borrowerId) {
      toast({
        title: "Error",
        description: "Please select a borrower",
        variant: "destructive",
      });
      return;
    }

    createLoanMutation.mutate({
      borrowerId,
      principalAmount,
      interestRate,
      interestRateType,
      startDate,
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
      <DialogContent className="max-w-2xl" data-testid="modal-add-loan">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Enter loan details for the borrower
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="borrower">Select Borrower *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount (₹) *</Label>
                <Input
                  id="principal"
                  type="number"
                  placeholder="100000"
                  required
                  min="1"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  data-testid="input-principal-amount"
                  disabled={createLoanMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%) *</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  placeholder="12.5"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  data-testid="input-interest-rate"
                  disabled={createLoanMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interest-rate-type">Interest Rate Type *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                  disabled={createLoanMutation.isPending}
                />
              </div>
            </div>
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
