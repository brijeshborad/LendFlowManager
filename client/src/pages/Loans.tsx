import {useEffect, useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {ArrowLeft, Calendar, Edit, MoreHorizontal, Plus, Trash2, TrendingUp, Wallet} from "lucide-react";
import {useLocation} from "wouter";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
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
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {AddLoanModal} from "@/components/AddLoanModal";
import {EditLoanModal} from "@/components/EditLoanModal";
import {AddPaymentModal} from "@/components/AddPaymentModal";
import {EditPaymentModal} from "@/components/EditPaymentModal";
import {useToast} from "@/hooks/use-toast";
import {apiRequest, queryClient} from "@/lib/queryClient";
import {Borrower, Loan, Payment} from "@shared/schema";

export default function Loans() {
    const {toast} = useToast();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
    const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
    const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [deleteLoanDialogOpen, setDeleteLoanDialogOpen] = useState(false);
    const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<Loan | null>(null);
    const [, setLocation] = useLocation();
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    const {data: loans = [], isLoading} = useQuery<Loan[]>({
        queryKey: ['/api/loans'],
    });

    const {data: borrowers = []} = useQuery<Borrower[]>({
        queryKey: ['/api/borrowers'],
    });

    const {data: payments = []} = useQuery<Payment[]>({
        queryKey: ['/api/payments'],
    });

    const {data: realTimeInterest = []} = useQuery<[]>({
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
            queryClient.invalidateQueries({queryKey: ['/api/payments']});
            queryClient.invalidateQueries({queryKey: ['/api/loans']});
            queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
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
            queryClient.invalidateQueries({queryKey: ['/api/loans']});
            queryClient.invalidateQueries({queryKey: ['/api/payments']});
            queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
            setDeleteLoanDialogOpen(false);
            setSelectedLoanForDelete(null);
            setSelectedLoanId(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete loan",
                variant: "destructive",
            });
        },
    });

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
        if (id) setSelectedLoanId(id);
    }, []);

    const selectedLoan = loans.find(l => l.id === selectedLoanId);
    const selectedBorrower = borrowers.find(b => b.id === selectedLoan?.borrowerId);
    const loanPayments = payments.filter((p: any) => p.loanId === selectedLoanId);
    const loanInterest = realTimeInterest.find((i: any) => i.loanId === selectedLoanId);

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `₹${num.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    };

    const getLatestInterestClearedDate = (loanId: string) => {
        const loanPayments = payments.filter((p: any) =>
            p.loanId === loanId &&
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
        const month = dateObj.toLocaleDateString('en-IN', {month: 'short'});
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
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Back to Loans
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">{selectedBorrower?.name}</h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-muted-foreground">Loan Details</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4"/>
                                <span>Started: {formatDate(selectedLoan.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-sm font-medium text-purple-700">
                  Interest cleared till {getLatestInterestClearedDate(selectedLoan.id) ? formatDate(getLatestInterestClearedDate(selectedLoan.id)) : "-"}
                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setAddPaymentModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Add Payment
                        </Button>
                        <Button onClick={() => setEditModalOpen(true)} variant="outline">
                            <Edit className="h-4 w-4 mr-2"/>
                            Edit Loan
                        </Button>
                        <Button onClick={() => handleDeleteLoan(selectedLoan)} variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4 mr-2"/>
                            Delete Loan
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Principal Balance */}
                    <Card>
                        <CardHeader className="pb-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Principal
                                Balance</h2>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Principal Amount</p>
                                <p className="text-lg font-bold font-mono text-blue-600">
                                    {formatCurrency(selectedLoan.principalAmount)}
                                </p>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Principal Paid</p>
                                <p className="text-lg font-bold font-mono text-green-600">
                                    {formatCurrency(loanPayments
                                        .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                                        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0))}
                                </p>
                            </div>
                            <div className="flex justify-between items-baseline border-t pt-2.5">
                                <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                                <p className="text-lg font-bold font-mono text-orange-600">
                                    {formatCurrency(
                                        parseFloat(selectedLoan.principalAmount) -
                                        loanPayments
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
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interest
                                Summary</h2>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Interest Earned</p>
                                <p className="text-lg font-bold font-mono text-blue-600">{formatCurrency(interestGenerated)}</p>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Interest Paid</p>
                                <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(interestPaid)}</p>
                            </div>
                            <div className="flex justify-between items-baseline border-t pt-2.5">
                                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                                <p className="text-lg font-bold font-mono text-orange-600">{formatCurrency(pendingInterest)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Outstanding */}
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-2">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total
                                Outstanding</h2>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Outstanding Principal</p>
                                <p className="font-semibold font-mono text-orange-600">
                                    {formatCurrency(
                                        parseFloat(selectedLoan.principalAmount) -
                                        loanPayments
                                            .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                                            .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)
                                    )}
                                </p>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Pending Interest</p>
                                <p className="font-semibold font-mono text-orange-600">{formatCurrency(pendingInterest)}</p>
                            </div>
                            <div className="border-t pt-2.5">
                                <div className="flex justify-between items-baseline">
                                    <p className="text-xs font-semibold text-muted-foreground">Total Amount Due</p>
                                    <p className="text-xl font-bold font-mono text-red-600">
                                        {formatCurrency(
                                            (parseFloat(selectedLoan.principalAmount) -
                                                loanPayments
                                                    .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
                                                    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)) +
                                            pendingInterest
                                        )}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6">
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
                                        <div key={payment.id}
                                             className="flex justify-between items-center p-3.5 border rounded-lg hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        payment.paymentType === 'principal' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                                                            payment.paymentType === 'interest' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' :
                                                                payment.paymentType === 'partial_interest' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                                                                    'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                                                    }`}>
                                                    <TrendingUp className="h-4 w-4"/>
                                                </div>
                                                <div>
                                                    <p className="text-base font-semibold font-mono">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span
                                                            className="text-xs text-muted-foreground capitalize">{payment.paymentType.replace('_', ' ')}</span>
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <span
                                                            className="text-xs text-muted-foreground capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                                                    </div>
                                                    {payment.interestClearedTillDate && (
                                                        <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">Cleared
                                                            till {formatDate(payment.interestClearedTillDate)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreHorizontal className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                                                            <Edit className="h-4 w-4 mr-2"/>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeletePayment(payment)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2"/>
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
                                Are you sure you want to delete this payment of ₹{selectedPayment?.amount}? This action
                                cannot be undone.
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
                                Are you sure you want to delete the loan
                                of {selectedLoanForDelete && formatCurrency(selectedLoanForDelete.principalAmount)} for {selectedLoanForDelete && getBorrowerName(selectedLoanForDelete.borrowerId)}?
                                This will also delete all associated payments. This action cannot be undone.
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
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold">Loans</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage all loans
                    </p>
                </div>
                <Button onClick={() => setAddModalOpen(true)} data-testid="button-add-loan">
                    <Plus className="h-4 w-4 mr-2"/>
                    Create Loan
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-64" data-testid={`skeleton-loan-${i}`}/>
                    ))}
                </div>
            ) : loans.length === 0 ? (
                <div className="p-12 text-center border rounded-lg">
                    <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground"/>
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
                        <Plus className="h-4 w-4 mr-2"/>
                        Create Your First Loan
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loans.map((loan) => (
                        <Card key={loan.id} className="hover-elevate cursor-pointer"
                              onClick={() => handleViewLoan(loan.id)} data-testid={`card-loan-${loan.id}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Wallet className="h-4 w-4 text-primary"/>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold" data-testid={`text-borrower-name-${loan.id}`}>
                                                {getBorrowerName(loan.borrowerId)}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge
                                                    variant={
                                                        loan.status === 'active' ? 'default' :
                                                            loan.status === 'overdue' ? 'destructive' :
                                                                'secondary'
                                                    }
                                                    className="text-[10px] h-5"
                                                    data-testid={`badge-loan-status-${loan.id}`}
                                                >
                                                    {loan.status}
                                                </Badge>
                                                <span
                                                    className="text-xs text-muted-foreground">{loan.interestRate}% {loan.interestRateType}</span>
                                            </div>
                                        </div>
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
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete Loan</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2">
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Principal
                                        Amount</p>
                                    <p className="text-xl font-bold font-mono mt-0.5"
                                       data-testid={`text-principal-${loan.id}`}>
                                        {formatCurrency(loan.principalAmount)}
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-1 border-t">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                                        <span className="text-muted-foreground">Started:</span>
                                        <span className="font-medium"
                                              data-testid={`text-start-date-${loan.id}`}>{formatDate(loan.startDate)}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0"/>
                                        <span className="text-muted-foreground">Cleared till:</span>
                                        <span className="font-medium text-green-600"
                                              data-testid={`text-interest-cleared-${loan.id}`}>
                      {getLatestInterestClearedDate(loan.id)
                          ? formatDate(getLatestInterestClearedDate(loan.id))
                          : "No payments"
                      }
                    </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AddLoanModal open={addModalOpen} onClose={() => setAddModalOpen(false)}/>
            <AlertDialog open={deleteLoanDialogOpen} onOpenChange={setDeleteLoanDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the loan
                            of {selectedLoanForDelete && formatCurrency(selectedLoanForDelete.principalAmount)} for {selectedLoanForDelete && getBorrowerName(selectedLoanForDelete.borrowerId)}?
                            This will also delete all associated payments. This action cannot be undone.
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
