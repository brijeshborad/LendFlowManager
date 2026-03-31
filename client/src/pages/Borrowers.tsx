import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus, Mail, Phone, MapPin, ArrowLeft, Plus, Edit, Trash2, MoreHorizontal, Wallet, TrendingUp } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import { AddLoanModal } from "@/components/AddLoanModal";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { EditPaymentModal } from "@/components/EditPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Borrower, Loan, Payment } from "@shared/schema";

export default function Borrowers() {
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoanModalOpen, setAddLoanModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteLoanDialogOpen, setDeleteLoanDialogOpen] = useState(false);
  const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<Loan | null>(null);
  const [deleteBorrowerDialogOpen, setDeleteBorrowerDialogOpen] = useState(false);
  const [selectedBorrowerForDelete, setSelectedBorrowerForDelete] = useState<Borrower | null>(null);
  const [, setLocation] = useLocation();
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);

  const { data: borrowers = [], isLoading } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });
  
  const { data: loans = [] } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
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

  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: string) => {
      await apiRequest("DELETE", `/api/loans/${loanId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loan deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setDeleteLoanDialogOpen(false);
      setSelectedLoanForDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete loan",
        variant: "destructive",
      });
    },
  });

  const deleteBorrowerMutation = useMutation({
    mutationFn: async (borrowerId: string) => {
      await apiRequest("DELETE", `/api/borrowers/${borrowerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Borrower and all linked data deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setDeleteBorrowerDialogOpen(false);
      setSelectedBorrowerForDelete(null);
      setSelectedBorrowerId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete borrower",
        variant: "destructive",
      });
    },
  });

  const handleDeleteBorrower = (borrower: Borrower, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBorrowerForDelete(borrower);
    setDeleteBorrowerDialogOpen(true);
  };

  const confirmDeleteBorrower = () => {
    if (selectedBorrowerForDelete) {
      deleteBorrowerMutation.mutate(selectedBorrowerForDelete.id);
    }
  };

  const handleDeleteLoan = (loan: Loan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLoanForDelete(loan);
    setDeleteLoanDialogOpen(true);
  };

  const confirmDeleteLoan = () => {
    if (selectedLoanForDelete) {
      deleteLoanMutation.mutate(selectedLoanForDelete.id);
    }
  };

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
    if (id) setSelectedBorrowerId(id);
  }, []);
  
  const selectedBorrower = borrowers.find(b => b.id === selectedBorrowerId);
  const borrowerLoans = loans.filter((l: any) => l.borrowerId === selectedBorrowerId);
  const activeLoans = borrowerLoans.filter((l: any) => l.status === 'active');
  const borrowerPayments = payments.filter((p: any) => borrowerLoans.some((l: any) => l.id === p.loanId));

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  // Calculate total interest summary for all borrower's loans
  const calculateTotalInterestSummary = () => {
    let totalEarned = 0;
    let totalPaid = 0;
    
    borrowerLoans.forEach((loan: any) => {
      const loanInterest = realTimeInterest.find((i: any) => i.loanId === loan.id);
      const loanPayments = payments.filter((p: any) => p.loanId === loan.id);
      
      totalEarned += loanInterest?.totalInterest || 0;
      totalPaid += loanPayments
        .filter((p: any) => p.paymentType === 'interest' || p.paymentType === 'partial_interest')
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    });
    
    return {
      earned: totalEarned,
      paid: totalPaid,
      pending: totalEarned - totalPaid
    };
  };

  const interestSummary = calculateTotalInterestSummary();

  // Find the latest interest cleared till date
  const getLatestInterestClearedDate = () => {
    const paymentsWithInterestDate = borrowerPayments
      .filter((p: any) => p.interestClearedTillDate)
      .sort((a: any, b: any) => new Date(b.interestClearedTillDate).getTime() - new Date(a.interestClearedTillDate).getTime());
    
    return paymentsWithInterestDate.length > 0 ? paymentsWithInterestDate[0].interestClearedTillDate : null;
  };

  const latestInterestClearedDate = getLatestInterestClearedDate();

  if (selectedBorrower) {
    return (
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedBorrowerId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Borrowers
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">{selectedBorrower.name}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
              <p className="text-muted-foreground">{selectedBorrower.email} • {selectedBorrower.phone}</p>
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-purple-700">
                  Interest cleared till {latestInterestClearedDate ? formatDate(latestInterestClearedDate) : "-"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="md:h-10 md:px-4 md:text-sm" onClick={() => setAddLoanModalOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Create </span>Loan
            </Button>
            <Button size="sm" className="md:h-10 md:px-4 md:text-sm" onClick={() => setAddPaymentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              Payment
            </Button>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="md:h-10 md:w-10 text-muted-foreground hover:text-red-600"
                    onClick={(e) => handleDeleteBorrower(selectedBorrower, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Borrower</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Principal Balance */}
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Principal Balance</h2>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Total Principal Lent</p>
                <p className="text-lg font-bold font-mono text-blue-600">
                  {formatCurrency(borrowerLoans.reduce((sum: number, loan: any) => sum + parseFloat(loan.principalAmount), 0))}
                </p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Principal Paid</p>
                <p className="text-lg font-bold font-mono text-green-600">
                  {formatCurrency(borrowerPayments
                    .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0))}
                </p>
              </div>
              <div className="flex justify-between items-baseline border-t pt-2.5">
                <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold font-mono text-orange-600">
                  {formatCurrency(
                    borrowerLoans.reduce((sum: number, loan: any) => sum + parseFloat(loan.principalAmount), 0) -
                    borrowerPayments
                      .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interest Summary */}
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interest Summary</h2>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Interest Earned</p>
                <p className="text-lg font-bold font-mono text-blue-600">{formatCurrency(interestSummary.earned)}</p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Interest Paid</p>
                <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(interestSummary.paid)}</p>
              </div>
              <div className="flex justify-between items-baseline border-t pt-2.5">
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="text-lg font-bold font-mono text-orange-600">{formatCurrency(interestSummary.pending)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Outstanding */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total Outstanding</h2>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Outstanding Principal</p>
                <p className="font-semibold font-mono text-orange-600">
                  {formatCurrency(
                    borrowerLoans.reduce((sum: number, loan: any) => sum + parseFloat(loan.principalAmount), 0) -
                    borrowerPayments
                      .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)
                  )}
                </p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">Pending Interest</p>
                <p className="font-semibold font-mono text-orange-600">{formatCurrency(interestSummary.pending)}</p>
              </div>
              <div className="border-t pt-2.5">
                <div className="flex justify-between items-baseline">
                  <p className="text-xs font-semibold text-muted-foreground">Total Amount Due</p>
                  <p className="text-xl font-bold font-mono text-red-600">
                    {formatCurrency(
                      (borrowerLoans.reduce((sum: number, loan: any) => sum + parseFloat(loan.principalAmount), 0) -
                      borrowerPayments
                        .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)) +
                      interestSummary.pending
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Active Loans */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Active Loans ({activeLoans.length})</h2>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <p className="text-muted-foreground">No active loans</p>
            ) : (
              <div className="grid gap-4">
                {activeLoans.map((loan: any) => {
                  const loanInterest = realTimeInterest.find((i: any) => i.loanId === loan.id);
                  const loanPayments = payments.filter((p: any) => p.loanId === loan.id);
                  const principalPaid = loanPayments
                    .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
                  const outstandingPrincipal = parseFloat(loan.principalAmount) - principalPaid;
                  const totalPaid = loanPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
                  
                  return (
                    <div key={loan.id} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setLocation(`/loans?id=${loan.id}`)}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{formatCurrency(loan.principalAmount)}</span>
                            <Badge variant="default" className="text-xs">Active</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{loan.interestRate}% {loan.interestRateType}</span>
                            </div>
                            <span>Outstanding: {formatCurrency(outstandingPrincipal)}</span>
                            <span>Started: {formatDate(loan.startDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Total Paid</p>
                            <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
                          </div>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                  onClick={(e) => handleDeleteLoan(loan, e)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Loan</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Payment History */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Payment History ({borrowerPayments.length})</h2>
          </CardHeader>
          <CardContent>
            {borrowerPayments.length === 0 ? (
              <p className="text-muted-foreground">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {borrowerPayments.map((payment: any) => {
                  return (
                    <div key={payment.id} className="flex justify-between items-center p-3.5 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          payment.paymentType === 'principal' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                          payment.paymentType === 'interest' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' :
                          payment.paymentType === 'partial_interest' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                          'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                        }`}>
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-base font-semibold font-mono">{formatCurrency(payment.amount)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground capitalize">{payment.paymentType.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                          </div>
                          {payment.interestClearedTillDate && (
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">Cleared till {formatDate(payment.interestClearedTillDate)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        <AddLoanModal 
          open={addLoanModalOpen} 
          onClose={() => setAddLoanModalOpen(false)} 
          preSelectedBorrowerId={selectedBorrowerId}
        />
        <AddPaymentModal 
          open={addPaymentModalOpen} 
          onClose={() => setAddPaymentModalOpen(false)} 
          preSelectedBorrowerId={selectedBorrowerId}
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
                Are you sure you want to delete this payment of {selectedPayment && formatCurrency(selectedPayment.amount)}? This action cannot be undone.
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
        <AlertDialog open={deleteLoanDialogOpen} onOpenChange={setDeleteLoanDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Loan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the loan of {selectedLoanForDelete && formatCurrency(selectedLoanForDelete.principalAmount)} for {selectedBorrower.name}? This will also delete all associated payments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteLoan}
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
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Borrowers</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1">
            Manage your borrowers and their details
          </p>
        </div>
        <Button size="sm" className="md:h-10 md:px-4 md:text-sm" onClick={() => setAddModalOpen(true)} data-testid="button-add-borrower">
          <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Add </span>Borrower
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-borrower-${i}`} />
          ))}
        </div>
      ) : borrowers.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <UserPlus className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Borrowers Yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first borrower
          </p>
          <Button onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Your First Borrower
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {borrowers.map((borrower) => (
            <Card key={borrower.id} className="hover-elevate cursor-pointer overflow-hidden" onClick={() => setSelectedBorrowerId(borrower.id)} data-testid={`card-borrower-${borrower.id}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">
                      {borrower.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate" data-testid={`text-borrower-name-${borrower.id}`}>
                        {borrower.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                onClick={(e) => handleDeleteBorrower(borrower, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Borrower</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      <Badge
                        variant={
                          borrower.status === 'active' ? 'default' :
                          borrower.status === 'overdue' ? 'destructive' :
                          'secondary'
                        }
                        className="text-[10px] h-5 shrink-0"
                        data-testid={`badge-status-${borrower.id}`}
                      >
                        {borrower.status}
                      </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate" data-testid={`text-email-${borrower.id}`}>{borrower.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span data-testid={`text-phone-${borrower.id}`}>{borrower.phone}</span>
                  </div>
                  {borrower.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1" data-testid={`text-address-${borrower.id}`}>
                        {borrower.address}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBorrowerModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />

      <AlertDialog open={deleteBorrowerDialogOpen} onOpenChange={setDeleteBorrowerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Borrower</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete <span className="font-semibold text-foreground">{selectedBorrowerForDelete?.name}</span>?
                </p>
                {selectedBorrowerForDelete && (() => {
                  const linkedLoans = loans.filter((l: any) => l.borrowerId === selectedBorrowerForDelete.id);
                  const linkedPayments = payments.filter((p: any) => linkedLoans.some((l: any) => l.id === p.loanId));
                  if (linkedLoans.length > 0) {
                    return (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
                        <p className="font-medium text-destructive">This will permanently delete:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          <li>{linkedLoans.length} loan{linkedLoans.length > 1 ? 's' : ''} ({linkedLoans.filter((l: any) => l.status === 'active').length} active)</li>
                          <li>{linkedPayments.length} payment transaction{linkedPayments.length !== 1 ? 's' : ''}</li>
                          <li>All associated interest entries and reminders</li>
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })()}
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBorrower}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Borrower
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
