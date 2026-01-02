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
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { EditPaymentModal } from "@/components/EditPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Borrower, Loan, Payment } from "@shared/schema";

export default function Borrowers() {
  const { toast } = useToast();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
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

  if (selectedBorrower) {
    return (
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => setSelectedBorrowerId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Borrowers
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{selectedBorrower.name}</h1>
            <p className="text-muted-foreground mt-1">{selectedBorrower.email} • {selectedBorrower.phone}</p>
          </div>
          <Button onClick={() => setAddPaymentModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
        
        {/* Total Interest Summary */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Total Interest Summary</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Interest Earned</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(interestSummary.earned)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Interest Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(interestSummary.paid)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pending Interest</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(interestSummary.pending)}</p>
            </div>
          </CardContent>
        </Card>
        
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
                            <span>Started: {formatDate(loan.startDate)}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Total Paid</p>
                          <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
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
                  const loan = loans.find((l: any) => l.id === payment.loanId);
                  return (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.paymentType} • {payment.paymentMethod}
                          {loan && ` • Loan: ${formatCurrency(loan.principalAmount)}`}
                        </p>
                        {payment.interestClearedTillDate && (
                          <p className="text-xs text-purple-600 mt-1">
                            Interest cleared till: {formatDate(payment.interestClearedTillDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</p>
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
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
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Borrowers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your borrowers and their details
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} data-testid="button-add-borrower">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Borrower
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {borrowers.map((borrower) => (
            <Card key={borrower.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedBorrowerId(borrower.id)} data-testid={`card-borrower-${borrower.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {borrower.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-borrower-name-${borrower.id}`}>
                        {borrower.name}
                      </h3>
                      <Badge 
                        variant={
                          borrower.status === 'active' ? 'default' : 
                          borrower.status === 'overdue' ? 'destructive' : 
                          'secondary'
                        }
                        className="text-xs mt-1"
                        data-testid={`badge-status-${borrower.id}`}
                      >
                        {borrower.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span data-testid={`text-email-${borrower.id}`}>{borrower.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span data-testid={`text-phone-${borrower.id}`}>{borrower.phone}</span>
                </div>
                {borrower.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1" data-testid={`text-address-${borrower.id}`}>
                      {borrower.address}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBorrowerModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
