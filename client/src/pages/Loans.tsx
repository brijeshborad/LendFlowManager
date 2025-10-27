import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLoanModal } from "@/components/AddLoanModal";
import type { Loan, Borrower } from "@shared/schema";

export default function Loans() {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
  });

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });

  const getBorrowerName = (borrowerId: string) => {
    const borrower = borrowers.find(b => b.id === borrowerId);
    return borrower?.name || 'Unknown';
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Loans</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all loans
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} data-testid="button-add-loan">
          <Plus className="h-4 w-4 mr-2" />
          Create Loan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" data-testid={`skeleton-loan-${i}`} />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Loans Yet</h3>
          <p className="text-muted-foreground mb-4">
            {borrowers.length === 0 
              ? "Add a borrower first before creating loans"
              : "Create your first loan to get started"
            }
          </p>
          <Button 
            onClick={() => setAddModalOpen(true)} 
            disabled={borrowers.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Loan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map((loan) => (
            <Card key={loan.id} className="hover-elevate" data-testid={`card-loan-${loan.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg" data-testid={`text-borrower-name-${loan.id}`}>
                      {getBorrowerName(loan.borrowerId)}
                    </h3>
                    <Badge 
                      variant={
                        loan.status === 'active' ? 'default' : 
                        loan.status === 'overdue' ? 'destructive' : 
                        'secondary'
                      }
                      className="text-xs mt-1"
                      data-testid={`badge-loan-status-${loan.id}`}
                    >
                      {loan.status}
                    </Badge>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Principal Amount</p>
                  <p className="text-2xl font-bold" data-testid={`text-principal-${loan.id}`}>
                    {formatCurrency(loan.principalAmount)}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-semibold" data-testid={`text-interest-rate-${loan.id}`}>
                        {loan.interestRate}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rate Type</p>
                    <p className="font-semibold capitalize" data-testid={`text-interest-rate-type-${loan.id}`}>
                      {loan.interestRateType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Started: </span>
                    <span data-testid={`text-start-date-${loan.id}`}>{formatDate(loan.startDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddLoanModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
