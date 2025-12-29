import { useState, useEffect } from "react";
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
import type { Loan } from "@shared/schema";

interface EditLoanModalProps {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export function EditLoanModal({ open, onClose, loan }: EditLoanModalProps) {
  const { toast } = useToast();
  const [interestRate, setInterestRate] = useState("");
  const [interestRateType, setInterestRateType] = useState("monthly");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (loan && open) {
      setInterestRate(loan.interestRate.toString());
      setInterestRateType(loan.interestRateType);
      const dateStr = typeof loan.startDate === 'string' 
        ? (loan.startDate as string).split('T')[0]
        : new Date(loan.startDate).toISOString().split('T')[0];
      setStartDate(dateStr);
    }
  }, [loan, open]);

  const updateLoanMutation = useMutation({
    mutationFn: async (data: {
      interestRate: string;
      interestRateType: string;
      startDate: string;
    }) => {
      if (!loan) throw new Error("No loan selected");
      const response = await apiRequest("PATCH", `/api/loans/${loan.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loan updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/interest/real-time'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update loan",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateLoanMutation.mutate({
      interestRate,
      interestRateType,
      startDate,
    });
  };

  const handleClose = () => {
    if (!updateLoanMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Loan Details</DialogTitle>
          <DialogDescription>
            Update interest rate and start date for this loan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-interest-rate">Interest Rate (%) *</Label>
              <Input
                id="edit-interest-rate"
                type="number"
                placeholder="12.5"
                required
                min="0"
                max="100"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                disabled={updateLoanMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-interest-rate-type">Interest Rate Type *</Label>
              <Select 
                value={interestRateType} 
                onValueChange={setInterestRateType}
                disabled={updateLoanMutation.isPending}
              >
                <SelectTrigger id="edit-interest-rate-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date *</Label>
              <Input
                id="edit-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={updateLoanMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={updateLoanMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={updateLoanMutation.isPending}
            >
              {updateLoanMutation.isPending ? "Updating..." : "Update Loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
