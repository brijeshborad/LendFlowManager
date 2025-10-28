import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LucideIndianRupee, TrendingUp, Users, FileText } from "lucide-react";
import { format } from "date-fns";

type LoanSummaryItem = {
  loanId: string;
  borrowerName: string;
  principalAmount: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  status: string;
  totalInterest: number;
  totalPaid: number;
  balance: number;
  paymentCount: number;
};

type PaymentHistoryItem = {
  id: string;
  loanId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  borrowerName: string;
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
  totalPrincipal: number;
  totalInterest: number;
  totalPaid: number;
  balance: number;
  activeLoans: number;
};

export default function Reports() {
  const { data: loanSummary = [], isLoading: isLoadingLoans, error: loansError } = useQuery<LoanSummaryItem[]>({
    queryKey: ["/api/reports/loan-summary"],
  });

  const { data: paymentHistory = [], isLoading: isLoadingPayments, error: paymentsError } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["/api/reports/payment-history"],
  });

  const { data: interestEarned, isLoading: isLoadingInterest, error: interestError } = useQuery<InterestEarnedReport>({
    queryKey: ["/api/reports/interest-earned"],
  });

  const { data: borrowerSummary = [], isLoading: isLoadingBorrowers, error: borrowersError } = useQuery<BorrowerSummaryItem[]>({
    queryKey: ["/api/reports/borrower-summary"],
  });

  const formatCurrency = (amount: number | string) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;

      return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500/10 text-green-600",
      paid: "bg-blue-500/10 text-blue-600",
      defaulted: "bg-red-500/10 text-red-600",
    };
    return (
      <Badge className={`${variants[status] || ""} hover-elevate`} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const totalLoaned = loanSummary.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalInterestEarned = interestEarned?.total || 0;
  const totalReceived = loanSummary.reduce((sum, loan) => sum + loan.totalPaid, 0);
  const totalOutstanding = loanSummary.reduce((sum, loan) => sum + loan.balance, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold" data-testid="heading-reports">
          Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive financial reports and analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loaned</CardTitle>
            <LucideIndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-loaned">
              {formatCurrency(totalLoaned)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loanSummary.length} loans
            </p>
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
            <p className="text-xs text-muted-foreground">
              {interestEarned?.count || 0} entries
            </p>
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
            <p className="text-xs text-muted-foreground">
              {paymentHistory.length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono" data-testid="text-total-outstanding">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              To be collected
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="loans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="loans" data-testid="tab-loans">Loan Summary</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payment History</TabsTrigger>
          <TabsTrigger value="interest" data-testid="tab-interest">Interest Earned</TabsTrigger>
          <TabsTrigger value="borrowers" data-testid="tab-borrowers">Borrower Summary</TabsTrigger>
        </TabsList>

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
              ) : loanSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No loans found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead>Interest Earned</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanSummary.map((loan) => (
                      <TableRow key={loan.loanId} data-testid={`row-loan-${loan.loanId}`}>
                        <TableCell className="font-medium">{loan.borrowerName}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(loan.principalAmount)}</TableCell>
                        <TableCell className="font-mono">{loan.interestRate}%</TableCell>
                        <TableCell className="font-mono">{formatCurrency(loan.totalInterest)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(loan.totalPaid)}</TableCell>
                        <TableCell className="font-semibold font-mono">{formatCurrency(loan.balance)}</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell>{loan.dueDate ? format(new Date(loan.dueDate), 'MMM d, yyyy') : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{payment.borrowerName}</TableCell>
                        <TableCell className="font-semibold font-mono">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge className="hover-elevate">{payment.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interest Earned Report</CardTitle>
              <CardDescription>Monthly breakdown of interest income</CardDescription>
            </CardHeader>
            <CardContent>
              {interestError ? (
                <div className="text-center py-8 text-destructive" data-testid="error-interest">
                  Failed to load interest data. Please try refreshing the page.
                </div>
              ) : isLoadingInterest ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !interestEarned || interestEarned.monthly.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No interest data found</div>
              ) : (
                <>
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
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Interest Earned"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

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
              ) : borrowerSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No borrowers found</div>
              ) : (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={borrowerSummary}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="borrowerName" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="totalPrincipal" fill="#3b82f6" name="Principal" />
                        <Bar dataKey="totalInterest" fill="#10b981" name="Interest" />
                        <Bar dataKey="balance" fill="#f59e0b" name="Balance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Loans</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {borrowerSummary.map((borrower) => (
                        <TableRow key={borrower.borrowerId} data-testid={`row-borrower-${borrower.borrowerId}`}>
                          <TableCell className="font-medium">{borrower.borrowerName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {borrower.email}<br />
                            {borrower.phone}
                          </TableCell>
                          <TableCell>
                            <Badge className="hover-elevate">
                              {borrower.activeLoans} active / {borrower.loanCount} total
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{formatCurrency(borrower.totalPrincipal)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(borrower.totalInterest)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(borrower.totalPaid)}</TableCell>
                          <TableCell className="font-semibold font-mono">{formatCurrency(borrower.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
