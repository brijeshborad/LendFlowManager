import {useEffect, useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Upload} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {apiRequest, queryClient} from "@/lib/queryClient";
import type {Borrower, Loan, FundHolder} from "@shared/schema";

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
    const {toast} = useToast();
    const [borrowerId, setBorrowerId] = useState(preSelectedBorrowerId || "");
    const [loanId, setLoanId] = useState(preSelectedLoanId || "");
    const [paymentType, setPaymentType] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [collectedByFundHolderId, setCollectedByFundHolderId] = useState("");
    const [borrowerLoans, setBorrowerLoans] = useState<Loan[]>([]);

    // Reset state when modal closes or props change
    useEffect(() => {
        if (open) {
            setBorrowerId(preSelectedBorrowerId || "");
            setLoanId(preSelectedLoanId || "");
            setBorrowerLoans(allLoans.filter(loan => loan.borrowerId === preSelectedBorrowerId) || []);
        }
    }, [open, preSelectedBorrowerId, preSelectedLoanId]);

    // Fetch borrowers
    const {data: borrowers = []} = useQuery<Borrower[]>({
        queryKey: ['/api/borrowers'],
        enabled: open,
    });

    // Fetch loans for selected borrower
    const {data: allLoans = []} = useQuery<Loan[]>({
        queryKey: ['/api/loans'],
        enabled: open,
    });

    // Fetch payments to determine latest interestClearedTillDate for selected loan
    const {data: allPayments = []} = useQuery<any[]>({
        queryKey: ['/api/payments'],
        enabled: open && !!loanId,
    });

    // Fetch user settings and fund holders for cash tracking
    const {data: userSettings} = useQuery<any>({
        queryKey: ['/api/user/settings'],
        enabled: open,
    });
    const {data: fundHolders = []} = useQuery<FundHolder[]>({
        queryKey: ['/api/fund-holders'],
        enabled: open && userSettings?.cashTrackingEnabled,
    });

    const showCollectedBy = userSettings?.cashTrackingEnabled && fundHolders.length > 0;

    const minInterestClearedTillDate = loanId
        ? allPayments
            .filter((p: any) => p.loanId === loanId && p.interestClearedTillDate)
            .reduce((latest: string | null, p: any) => {
                const d = new Date(p.interestClearedTillDate).toISOString().split('T')[0];
                return !latest || d > latest ? d : latest;
            }, null)
        : null;

    // Reset loan when borrower changes (only if no pre-selected loan)
    useEffect(() => {
        if (borrowerId) {
            setLoanId(preSelectedLoanId || "");
            setBorrowerLoans(allLoans.filter(loan => loan.borrowerId === borrowerId) || []);
        }

    }, [borrowerId]);

    const addPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest("POST", "/api/payments", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['/api/payments']});
            queryClient.invalidateQueries({queryKey: ['/api/loans']});
            queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
            queryClient.invalidateQueries({queryKey: ['/api/cash-transactions']});
            queryClient.invalidateQueries({queryKey: ['/api/cash-transactions/balances']});
            toast({
                title: "Payment added",
                description: "The payment has been recorded successfully.",
            });
            setCollectedByFundHolderId("");
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
            ...(collectedByFundHolderId && { collectedByFundHolderId }),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-payment">
                <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                    <DialogDescription>
                        Record a new payment from a borrower
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="borrower" className="text-xs font-medium">Borrower</Label>
                                <Select value={borrowerId} onValueChange={setBorrowerId} required>
                                    <SelectTrigger id="borrower" data-testid="select-borrower">
                                        <SelectValue placeholder="Select borrower"/>
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
                            <div className="space-y-1.5">
                                <Label htmlFor="loan" className="text-xs font-medium">Loan</Label>
                                <Select value={loanId} onValueChange={setLoanId} required>
                                    <SelectTrigger id="loan" data-testid="select-loan">
                                        <SelectValue placeholder="Select loan"/>
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="payment-date" className="text-xs font-medium">Payment Date</Label>
                                <Input
                                    id="payment-date"
                                    name="payment-date"
                                    type="date"
                                    required
                                    className="h-10"
                                    data-testid="input-payment-date"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="amount" className="text-xs font-medium">Amount (₹)</Label>
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="payment-type" className="text-xs font-medium">Payment Type</Label>
                                <Select value={paymentType} onValueChange={setPaymentType} required>
                                    <SelectTrigger id="payment-type" data-testid="select-payment-type">
                                        <SelectValue placeholder="Select type"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="principal">Principal Repayment</SelectItem>
                                        <SelectItem value="interest">Interest Payment</SelectItem>
                                        <SelectItem value="partial-interest">Partial Interest</SelectItem>
                                        <SelectItem value="mixed">Mixed (Principal + Interest)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="payment-method" className="text-xs font-medium">Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                                    <SelectTrigger id="payment-method" data-testid="select-payment-method">
                                        <SelectValue placeholder="Select method"/>
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

                        {showCollectedBy && (
                            <div className="space-y-1.5">
                                <Label htmlFor="collected-by" className="text-xs font-medium">Collected By (Fund Holder)</Label>
                                <Select value={collectedByFundHolderId} onValueChange={setCollectedByFundHolderId}>
                                    <SelectTrigger id="collected-by">
                                        <SelectValue placeholder="Select fund holder (optional)"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fundHolders.map((fh: FundHolder) => (
                                            <SelectItem key={fh.id} value={fh.id}>
                                                {fh.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Cash will be added back to this fund holder's balance
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="reference" className="text-xs font-medium">Transaction Reference (Optional)</Label>
                            <Input
                                id="reference"
                                name="reference"
                                placeholder="UPI ID, Cheque number, etc."
                                data-testid="input-reference"
                            />
                        </div>

                        {(paymentType === 'interest' || paymentType === 'partial-interest') && (
                            <div className="space-y-1.5">
                                <Label htmlFor="interest-cleared-till" className="text-xs font-medium">Interest Cleared Till Date *</Label>
                                <Input
                                    id="interest-cleared-till"
                                    name="interest-cleared-till"
                                    type="date"
                                    required
                                    className="h-10"
                                    min={minInterestClearedTillDate || undefined}
                                    data-testid="input-interest-cleared-till"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {minInterestClearedTillDate
                                        ? `Date must be on or after ${new Date(minInterestClearedTillDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                        : 'Specify till which date the interest is cleared with this payment'}
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-medium">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                placeholder="Additional remarks about this payment..."
                                rows={3}
                                data-testid="textarea-notes"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Upload Receipt (Optional)</Label>
                            <div
                                className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/40 transition-colors cursor-pointer">
                                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5"/>
                                <p className="text-xs text-muted-foreground">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    PNG, JPG or PDF up to 10MB
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={addPaymentMutation.isPending}
                                data-testid="button-submit-payment">
                            {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
