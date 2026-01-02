import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, TrendingUp, Wallet, ArrowLeft, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddLoanModal } from "@/components/AddLoanModal";
import { EditLoanModal } from "@/components/EditLoanModal";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { EditPaymentModal } from "@/components/EditPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {Loan, Borrower, Payment} from "@shared/schema";

export default function Loans() {
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [, setLocation] = useLocation();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
  });

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });
  
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });
  
  const { data: realTimeInterest = [] } = useQuery<[]>({
    queryKey: ['/api/interest/real-time'],
  });
  
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("DELETE", `/api/payments/${paymentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setDeletePaymentDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditPaymentModalOpen(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setDeletePaymentDialogOpen(true);
  };

  const confirmDeletePayment = () => {
    if (selectedPayment) {
      deletePaymentMutation.mutate(selectedPayment.id);
    }
  };
  
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

  const getLatestInterestClearedDate = (loanId: string) => {
    const loanPayments = payments.filter((p: any) => 
      p.loanId === loanId && 
      (p.paymentType === 'interest' || p.paymentType === 'partial_interest') &&
      p.interestClearedTillDate
    );
    
    if (loanPayments.length === 0) return null;
    
    return loanPayments
      .sort((a: any, b: any) => new Date(b.interestClearedTillDate).getTime() - new Date(a.interestClearedTillDate).getTime())[0]
      .interestClearedTillDate;
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
    const year = dateObj.getFullYear();
    
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';
    
    return `${day}${suffix} ${month}, ${year}`;
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
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{selectedBorrower?.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-muted-foreground">Loan Details</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Started: {formatDate(selectedLoan.startDate)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddPaymentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
            <Button onClick={() => setEditModalOpen(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Loan
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Principal Amount</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(selectedLoan.principalAmount)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Interest Rate</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{selectedLoan.interestRate}% <span className="text-lg text-muted-foreground">{selectedLoan.interestRateType}</span></p>
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
                  <div className="space-y-3">
                    {loanPayments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-start p-4 border rounded-lg hover:bg-muted/50">
                        <div className="space-y-1">
                          <p className="text-xl font-semibold">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                          <p className="text-sm text-muted-foreground">{payment.paymentType} • {payment.paymentMethod}</p>
                          {payment.interestClearedTillDate && (
                            <p className="text-xs text-green-600 font-medium">Interest cleared till: {formatDate(payment.interestClearedTillDate)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDate(payment.paymentDate)}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePayment(payment)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Payment Summary</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Interest Earned:</span>
                  <span className="text-lg font-semibold text-blue-600">₹{interestGenerated.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Paid:</span>
                  <span className="text-lg font-semibold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Interest:</span>
                  <span className="text-lg font-semibold text-orange-600">₹{pendingInterest.toLocaleString('en-IN')}</span>
                </div>
                
                <hr className="my-4" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Interest Cleared Till:</span>
                  <span className="text-lg font-semibold text-green-600">
                    {getLatestInterestClearedDate(selectedLoan.id) 
                      ? formatDate(getLatestInterestClearedDate(selectedLoan.id))
                      : "No payments yet"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Loan Status</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedLoan.status === 'active' ? 'default' : 'secondary'}>
                    {selectedLoan.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Payments:</span>
                  <span className="font-medium">{loanPayments.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Days Active:</span>
                  <span className="font-medium">
                    {Math.floor((Date.now() - new Date(selectedLoan.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <EditLoanModal 
          open={editModalOpen} 
          onClose={() => setEditModalOpen(false)} 
          loan={selectedLoan || null}
        />
        <AddPaymentModal 
          open={addPaymentModalOpen} 
          onClose={() => setAddPaymentModalOpen(false)} 
          preSelectedBorrowerId={selectedLoan.borrowerId}
          loanId={selectedLoan.id}
        />
        <EditPaymentModal 
          open={editPaymentModalOpen} 
          onClose={() => setEditPaymentModalOpen(false)} 
          payment={selectedPayment}
        />
        <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment of ₹{selectedPayment?.amount}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeletePayment}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Started: </span>
                      <span data-testid={`text-start-date-${loan.id}`}>{formatDate(loan.startDate)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="text-muted-foreground">Interest cleared till: </span>
                      <span className="font-semibold text-green-600" data-testid={`text-interest-cleared-${loan.id}`}>
                        {getLatestInterestClearedDate(loan.id) 
                          ? formatDate(getLatestInterestClearedDate(loan.id))
                          : "No payments"
                        }
                      </span>
                    </div>
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
