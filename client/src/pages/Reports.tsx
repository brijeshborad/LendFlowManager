import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LucideIndianRupee, TrendingUp, FileText, X } from "lucide-react";
import type { Borrower } from "@shared/schema";

type LoanSummaryItem = {
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  principalAmount: number;
  principalPaid: number;
  interestPaid: number;
  outstandingPrincipal: number;
  interestRate: number;
  startDate: string;
  status: string;
  totalInterest: number;
  totalPaid: number;
  pendingInterest: number;
  interestClearedTillDate: string | null;
  paymentCount: number;
};

type PaymentHistoryItem = {
  id: string;
  loanId: string;
  amount: string;
  paymentDate: string;
  paymentType: string;
  paymentMethod: string;
  notes: string | null;
  borrowerName: string;
  interestClearedTillDate: string | null;
};

type InterestEarnedReport = {
  total: number;
  count: number;
  monthly: Array<{ month: string; total: number; count: number }>;
};

type BorrowerSummaryItem = {
  borrowerId: string;
  borrowerName: string;
  email: string;
  phone: string;
  loanCount: number;
  activeLoans: number;
  totalPrincipal: number;
  principalPaid: number;
  interestPaid: number;
  outstandingPrincipal: number;
  totalInterest: number;
  totalPaid: number;
  pendingInterest: number;
  interestClearedTillDate: string | null;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active only" },
  { value: "all", label: "All statuses" },
  { value: "settled", label: "Settled" },
  { value: "closed", label: "Closed" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "principal", label: "Principal" },
  { value: "interest", label: "Interest" },
  { value: "partial_interest", label: "Partial Interest" },
  { value: "mixed", label: "Mixed" },
];

function formatOrdinalDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const dateObj = typeof value === "string" ? new Date(value) : value;
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString("en-IN", { month: "short" });
  const year = dateObj.getFullYear();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  return `${day}${suffix} ${month}, ${year}`;
}

export default function Reports() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [borrowerFilter, setBorrowerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setBorrowerFilter("all");
    setStatusFilter("active");
    setPaymentTypeFilter("all");
  };

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ["/api/borrowers"],
    staleTime: 60000,
  });

  const { data: loanSummary = [], isLoading: isLoadingLoans, error: loansError } = useQuery<LoanSummaryItem[]>({
    queryKey: ["/api/reports/loan-summary"],
  });

  const { data: paymentHistory = [], isLoading: isLoadingPayments, error: paymentsError } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["/api/reports/payment-history"],
  });

  const interestQueryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    return qs ? `/api/reports/interest-earned?${qs}` : "/api/reports/interest-earned";
  }, [fromDate, toDate]);

  const { data: interestEarned, isLoading: isLoadingInterest, error: interestError } = useQuery<InterestEarnedReport>({
    queryKey: [interestQueryKey],
  });

  const { data: borrowerSummary = [], isLoading: isLoadingBorrowers, error: borrowersError } = useQuery<BorrowerSummaryItem[]>({
    queryKey: ["/api/reports/borrower-summary"],
  });

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
    if (isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500/10 text-green-600",
      settled: "bg-blue-500/10 text-blue-600",
      closed: "bg-slate-500/10 text-slate-600",
    };
    return (
      <Badge className={`${variants[status] || ""} hover-elevate`} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  // Apply filters to each report
  const filteredLoans = useMemo(() => {
    return loanSummary.filter((loan) => {
      if (statusFilter !== "all" && loan.status !== statusFilter) return false;
      if (borrowerFilter !== "all" && loan.borrowerId !== borrowerFilter) return false;
      if (fromDate && new Date(loan.startDate) < new Date(fromDate)) return false;
      if (toDate && new Date(loan.startDate) > new Date(toDate)) return false;
      return true;
    });
  }, [loanSummary, statusFilter, borrowerFilter, fromDate, toDate]);

  const filteredPayments = useMemo(() => {
    // Map loanId → loan so we can filter by borrower / status
    const loanIndex = new Map(loanSummary.map((l) => [l.loanId, l]));
    return paymentHistory.filter((payment) => {
      const loan = loanIndex.get(payment.loanId);
      if (statusFilter !== "all" && loan && loan.status !== statusFilter) return false;
      if (borrowerFilter !== "all") {
        // Match either via the loan's borrowerId OR the embedded borrowerName
        if (loan && loan.borrowerId !== borrowerFilter) return false;
      }
      if (paymentTypeFilter !== "all" && payment.paymentType !== paymentTypeFilter) return false;
      const paymentDate = new Date(payment.paymentDate);
      if (fromDate && paymentDate < new Date(fromDate)) return false;
      if (toDate && paymentDate > new Date(toDate)) return false;
      return true;
    });
  }, [paymentHistory, loanSummary, statusFilter, borrowerFilter, paymentTypeFilter, fromDate, toDate]);

  const filteredBorrowers = useMemo(() => {
    return borrowerSummary.filter((b) => {
      if (borrowerFilter !== "all" && b.borrowerId !== borrowerFilter) return false;
      // When status="active", only show borrowers who have at least one active loan
      if (statusFilter === "active" && b.activeLoans === 0) return false;
      return true;
    });
  }, [borrowerSummary, borrowerFilter, statusFilter]);

  // Summary cards reflect the loan filter (most informative cross-cut)
  const totalLoaned = filteredLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalReceived = filteredLoans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
  const totalOutstandingPrincipal = filteredLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
  const totalPendingInterest = filteredLoans.reduce((sum, l) => sum + (l.pendingInterest || 0), 0);
  const totalInterestEarned = filteredLoans.reduce((sum, l) => sum + (l.totalInterest || 0), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold" data-testid="heading-reports">
          Reports
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1">
          Comprehensive financial reports and analytics
        </p>
      </div>

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                max={toDate || today}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="filter-from-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="filter-to-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Borrower</Label>
              <Select value={borrowerFilter} onValueChange={setBorrowerFilter}>
                <SelectTrigger data-testid="filter-borrower">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All borrowers</SelectItem>
                  {borrowers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Loan Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Type</Label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger data-testid="filter-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="filter-reset">
              <X className="h-3.5 w-3.5 mr-1" />
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loaned</CardTitle>
            <LucideIndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-loaned">
              {formatCurrency(totalLoaned)}
            </div>
            <p className="text-xs text-muted-foreground">{filteredLoans.length} loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-interest-earned">
              {formatCurrency(totalInterestEarned)}
            </div>
            <p className="text-xs text-muted-foreground">Across filtered loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <LucideIndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-received">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Principal + interest paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Principal</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-outstanding">
              {formatCurrency(totalOutstandingPrincipal)}
            </div>
            <p className="text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-pending-interest">
              {formatCurrency(totalPendingInterest)}
            </div>
            <p className="text-xs text-muted-foreground">Accrued but unpaid</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="loans" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="loans" data-testid="tab-loans" className="text-xs sm:text-sm">
              Loans ({filteredLoans.length})
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments" className="text-xs sm:text-sm">
              Payments ({filteredPayments.length})
            </TabsTrigger>
            <TabsTrigger value="interest" data-testid="tab-interest" className="text-xs sm:text-sm">
              Interest
            </TabsTrigger>
            <TabsTrigger value="borrowers" data-testid="tab-borrowers" className="text-xs sm:text-sm">
              Borrowers ({filteredBorrowers.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Summary Report</CardTitle>
              <CardDescription>Overview of all loans with balances and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {loansError ? (
                <div className="text-center py-8 text-destructive" data-testid="error-loans">
                  Failed to load loan data. Please try refreshing the page.
                </div>
              ) : isLoadingLoans ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No loans match the current filters</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Principal & Rate</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Total Paid</TableHead>
                        <TableHead>Outstanding Principal</TableHead>
                        <TableHead>Interest Earned</TableHead>
                        <TableHead>Pending Interest</TableHead>
                        <TableHead>Total Outstanding</TableHead>
                        <TableHead>Interest Cleared Till</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoans.map((loan) => (
                        <TableRow key={loan.loanId} data-testid={`row-loan-${loan.loanId}`}>
                          <TableCell className="font-medium">{loan.borrowerName}</TableCell>
                          <TableCell>
                            <div className="font-mono font-semibold">{formatCurrency(loan.principalAmount)}</div>
                            <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                              {loan.interestRate}% rate
                            </div>
                          </TableCell>
                          <TableCell>{formatOrdinalDate(loan.startDate)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(loan.totalPaid)}</TableCell>
                          <TableCell className="font-mono text-orange-600">
                            {formatCurrency(loan.outstandingPrincipal)}
                          </TableCell>
                          <TableCell className="font-mono text-blue-600">{formatCurrency(loan.totalInterest)}</TableCell>
                          <TableCell className="font-mono text-red-600">{formatCurrency(loan.pendingInterest)}</TableCell>
                          <TableCell className="font-semibold font-mono text-red-600">
                            {formatCurrency(loan.outstandingPrincipal + loan.pendingInterest)}
                          </TableCell>
                          <TableCell className="font-mono text-blue-600">
                            {formatOrdinalDate(loan.interestClearedTillDate) ?? "No payments"}
                          </TableCell>
                          <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History Report</CardTitle>
              <CardDescription>Complete record of all payments received</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsError ? (
                <div className="text-center py-8 text-destructive" data-testid="error-payments">
                  Failed to load payment data. Please try refreshing the page.
                </div>
              ) : isLoadingPayments ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments match the current filters</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Interest Cleared Till</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell>{formatOrdinalDate(payment.paymentDate)}</TableCell>
                          <TableCell className="font-medium">{payment.borrowerName}</TableCell>
                          <TableCell className="font-semibold font-mono">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="hover-elevate">
                              {payment.paymentType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="hover-elevate">{payment.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-green-600">
                            {formatOrdinalDate(payment.interestClearedTillDate) ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.notes || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interest Earned Report</CardTitle>
              <CardDescription>Monthly breakdown of interest income (date filter applies)</CardDescription>
            </CardHeader>
            <CardContent>
              {interestError ? (
                <div className="text-center py-8 text-destructive" data-testid="error-interest">
                  Failed to load interest data. Please try refreshing the page.
                </div>
              ) : isLoadingInterest ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !interestEarned || interestEarned.monthly.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No interest entries match the date range</div>
              ) : (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Interest (filtered range)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-semibold font-mono">
                          {formatCurrency(interestEarned.total)}
                        </div>
                        <p className="text-xs text-muted-foreground">{interestEarned.count} entries</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={interestEarned.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Interest Earned" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Interest Earned</TableHead>
                          <TableHead>Number of Entries</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interestEarned.monthly.map((item) => (
                          <TableRow key={item.month} data-testid={`row-interest-${item.month}`}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="font-semibold font-mono">{formatCurrency(item.total)}</TableCell>
                            <TableCell>{item.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Borrower Summary Report</CardTitle>
              <CardDescription>Financial overview by borrower</CardDescription>
            </CardHeader>
            <CardContent>
              {borrowersError ? (
                <div className="text-center py-8 text-destructive" data-testid="error-borrowers">
                  Failed to load borrower data. Please try refreshing the page.
                </div>
              ) : isLoadingBorrowers ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredBorrowers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No borrowers match the current filters</div>
              ) : (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={filteredBorrowers}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="borrowerName" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="totalPrincipal" fill="#3b82f6" name="Principal" />
                        <Bar dataKey="totalInterest" fill="#10b981" name="Interest" />
                        <Bar dataKey="outstandingPrincipal" fill="#f59e0b" name="Outstanding" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Borrower</TableHead>
                          <TableHead>Loans</TableHead>
                          <TableHead>Total Lent</TableHead>
                          <TableHead>Outstanding Principal</TableHead>
                          <TableHead>Interest Earned</TableHead>
                          <TableHead>Total Paid</TableHead>
                          <TableHead>Pending Interest</TableHead>
                          <TableHead>Total Outstanding</TableHead>
                          <TableHead>Interest Cleared Till</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBorrowers.map((borrower) => (
                          <TableRow key={borrower.borrowerId} data-testid={`row-borrower-${borrower.borrowerId}`}>
                            <TableCell className="font-medium">{borrower.borrowerName}</TableCell>
                            <TableCell>
                              <Badge className="hover-elevate">
                                {borrower.activeLoans} active / {borrower.loanCount} total
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">{formatCurrency(borrower.totalPrincipal)}</TableCell>
                            <TableCell className="font-mono text-orange-600">
                              {formatCurrency(borrower.outstandingPrincipal)}
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">{formatCurrency(borrower.totalInterest)}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(borrower.totalPaid)}</TableCell>
                            <TableCell className="font-mono text-red-600">{formatCurrency(borrower.pendingInterest)}</TableCell>
                            <TableCell className="font-semibold font-mono text-red-600">
                              {formatCurrency(borrower.outstandingPrincipal + borrower.pendingInterest)}
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">
                              {formatOrdinalDate(borrower.interestClearedTillDate) ?? "No payments"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
