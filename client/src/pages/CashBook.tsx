import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Plus,
  Trash2,
  UserCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FundHolder } from "@shared/schema";

export default function CashBook() {
  const { toast } = useToast();
  const [addHolderOpen, setAddHolderOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [txFundHolderId, setTxFundHolderId] = useState("");
  const [txType, setTxType] = useState<string>("inflow");
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterHolder, setFilterHolder] = useState<string>("all");

  const { data: fundHolders = [] } = useQuery<FundHolder[]>({
    queryKey: ["/api/fund-holders"],
  });

  const { data: balances = [] } = useQuery<{ fundHolderId: string; name: string; balance: number }[]>({
    queryKey: ["/api/cash-transactions/balances"],
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/cash-transactions"],
  });

  const createHolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/fund-holders", { name });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fund holder added" });
      queryClient.invalidateQueries({ queryKey: ["/api/fund-holders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions/balances"] });
      setHolderName("");
      setAddHolderOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cash-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transaction recorded" });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions/balances"] });
      resetTransactionForm();
      setAddTransactionOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cash-transactions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Transaction deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions/balances"] });
      setDeleteTransactionId(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const resetTransactionForm = () => {
    setTxFundHolderId("");
    setTxType("inflow");
    setTxAmount("");
    setTxNotes("");
    setTxDate(new Date().toISOString().split("T")[0]);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    createTransactionMutation.mutate({
      fundHolderId: txFundHolderId,
      type: txType,
      amount: txAmount,
      notes: txNotes,
      transactionDate: txDate,
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const day = d.getDate();
    const month = d.toLocaleDateString("en-IN", { month: "short" });
    const year = d.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? "st" :
      day === 2 || day === 22 ? "nd" :
        day === 3 || day === 23 ? "rd" : "th";
    return `${day}${suffix} ${month}, ${year}`;
  };

  const totalCashOnHand = balances.reduce((sum, b) => sum + b.balance, 0);

  const filteredTransactions = filterHolder === "all"
    ? transactions
    : transactions.filter((t: any) => t.fundHolderId === filterHolder);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Cash Book</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1">
            Track cash held by fund holders and fund flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="md:h-10 md:px-4 md:text-sm" variant="outline" onClick={() => setAddHolderOpen(true)}>
            <UserCircle className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add </span>Holder
          </Button>
          <Button size="sm" className="md:h-10 md:px-4 md:text-sm" onClick={() => setAddTransactionOpen(true)} disabled={fundHolders.length === 0}>
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add </span>Transaction
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total Cash on Hand</h2>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono ${totalCashOnHand >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalCashOnHand)}
            </p>
          </CardContent>
        </Card>
        {balances.map((b) => (
          <Card key={b.fundHolderId}>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{b.name}</h2>
            </CardHeader>
            <CardContent>
              <p className={`text-xl font-bold font-mono ${b.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(b.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {fundHolders.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Fund Holders Added</h3>
          <p className="text-muted-foreground mb-4">
            Add fund holders who hold cash to start tracking fund flow
          </p>
          <Button onClick={() => setAddHolderOpen(true)}>
            <UserCircle className="h-4 w-4 mr-2" />
            Add First Fund Holder
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <Select value={filterHolder} onValueChange={setFilterHolder}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by fund holder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fund Holders</SelectItem>
                {fundHolders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-3.5 border rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.type === "inflow" || tx.type === "payment_collection"
                            ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                            : tx.type === "loan_disbursement"
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                              : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "inflow" || tx.type === "payment_collection" ? (
                          <ArrowDownCircle className="h-4 w-4" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold font-mono">
                          {tx.type === "inflow" || tx.type === "payment_collection" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              tx.type === "inflow" || tx.type === "payment_collection"
                                ? "text-green-600 border-green-300"
                                : tx.type === "loan_disbursement"
                                  ? "text-blue-600 border-blue-300"
                                  : "text-red-600 border-red-300"
                            }`}
                          >
                            {tx.type === "loan_disbursement" ? "Loan Given" : tx.type === "payment_collection" ? "Payment Collected" : tx.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{tx.fundHolderName}</span>
                        </div>
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => setDeleteTransactionId(tx.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Fund Holder Dialog */}
      <Dialog open={addHolderOpen} onOpenChange={setAddHolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Fund Holder</DialogTitle>
            <DialogDescription>Add a fund holder who holds cash</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createHolderMutation.mutate(holderName);
            }}
          >
            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fund Holder Name *</Label>
                <Input
                  placeholder="e.g. Brijesh"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddHolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createHolderMutation.isPending}>
                {createHolderMutation.isPending ? "Adding..." : "Add Fund Holder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cash Transaction</DialogTitle>
            <DialogDescription>Record a cash inflow or outflow</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTransaction}>
            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fund Holder *</Label>
                <Select value={txFundHolderId} onValueChange={setTxFundHolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund holder" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundHolders.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Type *</Label>
                  <Select value={txType} onValueChange={setTxType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflow">Cash Inflow</SelectItem>
                      <SelectItem value="outflow">Cash Outflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Amount *</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    min="0.01"
                    step="0.01"
                    className="font-mono"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date *</Label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  placeholder="e.g. Cash received from client payment, Interest collection..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddTransactionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransactionMutation.isPending || !txFundHolderId}>
                {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTransactionId && deleteTransactionMutation.mutate(deleteTransactionId)}
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
