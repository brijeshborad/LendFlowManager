import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, TrendingUp, Wallet, ArrowLeft, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLoanModal } from "@/components/AddLoanModal";
import type { Loan, Borrower } from "@shared/schema";

export default function Loans() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
  });

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });
  
  const { data: payments = [] } = useQuery({
    queryKey: ['/api/payments'],
  });
  
  const { data: realTimeInterest = [] } = useQuery({
    queryKey: ['/api/interest/real-time'],
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setSelectedLoanId(id);
  }, []);
  
  const selectedLoan = loans.find(l => l.id === selectedLoanId);
  const selectedBorrower = borrowers.find(b => b.id === selectedLoan?.borrowerId);
  const loanPayments = payments.filter((p: any) => p.loanId === selectedLoanId);
  const loanInterest = realTimeInterest.find((i: any) => i.loanId === selectedLoanId);

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

  const getBorrowerName = (borrowerId: string) => {
    const borrower = borrowers.find(b => b.id === borrowerId);
    return borrower?.name || 'Unknown';
  };

  const handleViewLoan = (loanId: string) => {
    setSelectedLoanId(loanId);
    window.history.pushState({}, '', `/loans?id=${loanId}`);
  };
  
  if (selectedLoan) {
    const totalPaid = loanPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const interestGenerated = loanInterest?.totalInterest || 0;
    const interestPaid = loanPayments
      .filter((p: any) => p.paymentType === 'interest' || p.paymentType === 'partial_interest')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const pendingInterest = interestGenerated - interestPaid;
    
    return (
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => setSelectedLoanId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loans
        </Button>
        
        <div>
          <h1 className="text-3xl font-semibold">{selectedBorrower?.name}</h1>
          <p className="text-muted-foreground mt-1">Loan Details</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Principal Amount</h3>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(selectedLoan.principalAmount)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Interest Rate</h3>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{selectedLoan.interestRate}% {selectedLoan.interestRateType}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Total Paid</h3>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Payment History</h2>
          </CardHeader>
          <CardContent>
            {loanPayments.length === 0 ? (
              <p className="text-muted-foreground">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {loanPayments.map((payment: any) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-semibold">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-muted-foreground">{payment.paymentType} • {payment.paymentMethod}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Card key={loan.id} className="hover-elevate cursor-pointer" onClick={() => handleViewLoan(loan.id)} data-testid={`card-loan-${loan.id}`}>
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
