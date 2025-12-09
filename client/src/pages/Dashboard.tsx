import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LucideIndianRupee, TrendingUp, Users, Banknote, Plus, UserPlus, PieChart as PieChartIcon } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { BorrowerCard } from "@/components/BorrowerCard";
import { InterestChart } from "@/components/InterestChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Borrower, Loan, Payment, InterestEntry } from "@shared/schema";
import avatar1 from '@assets/generated_images/Professional_male_avatar_headshot_3c69c06f.png';
import avatar2 from '@assets/generated_images/Professional_female_avatar_headshot_d7c69081.png';
import avatar3 from '@assets/generated_images/Professional_diverse_avatar_headshot_7572a5aa.png';

interface DashboardStats {
  totalLent: string;
  totalOutstanding: string;
  totalPendingInterest: string;
  activeBorrowers: number;
}

export default function Dashboard() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [borrowerModalOpen, setBorrowerModalOpen] = useState(false);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch borrowers
  const { data: borrowers = [], isLoading: borrowersLoading } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });

  // Fetch all loans
  const { data: loans = [] } = useQuery<Loan[]>({
    queryKey: ['/api/loans'],
  });

  // Fetch all payments
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });

  // Fetch interest entries
  const { data: interestEntries = [] } = useQuery<InterestEntry[]>({
    queryKey: ['/api/interest-entries'],
  });

  const [chartTimeRange, setChartTimeRange] = useState(6);

  // Generate dynamic chart data based on selected time range
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: { [key: string]: { received: number; pending: number } } = {};
    
    // Initialize months based on time range
    const today = new Date();
    for (let i = chartTimeRange - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[date.getMonth()]}`;
      months[key] = { received: 0, pending: 0 };
    }

    // Aggregate payments by month
    payments.forEach(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const monthKey = monthNames[paymentDate.getMonth()];
      if (months[monthKey]) {
        months[monthKey].received += parseFloat(payment.amount);
      }
    });

    // Calculate pending interest (simplified - from outstanding principal)
    const totalOutstandingStr = stats?.totalOutstanding?.replace(/[^0-9.-]/g, '') || '0';
    const totalOutstanding = parseFloat(totalOutstandingStr) || 0;
    const monthlyPending = totalOutstanding * 0.01; // Approximate 1% monthly
    
    return Object.entries(months).map(([month, data]) => ({
      month,
      received: Math.round(data.received),
      pending: Math.round(monthlyPending),
    }));
  }, [payments, stats, chartTimeRange]);

  // Generate dynamic activity feed from recent payments and loans
  const activities = useMemo(() => {
    const allActivities: Array<{
      id: string;
      type: 'payment' | 'alert' | 'reminder' | 'system';
      title: string;
      description: string;
      amount?: string;
      timestamp: string;
    }> = [];

    // Add recent payments
    const sortedPayments = [...payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5);

    sortedPayments.forEach(payment => {
      const loan = loans.find(l => l.id === payment.loanId);
      const borrower = borrowers.find(b => b.id === loan?.borrowerId);
      
      const timeAgo = getTimeAgo(new Date(payment.paymentDate));
      
      allActivities.push({
        id: payment.id,
        type: 'payment',
        title: `Payment Received - ${borrower?.name || 'Unknown'}`,
        description: `${payment.paymentType} payment via ${payment.paymentMethod}`,
        amount: `₹${parseFloat(payment.amount).toLocaleString('en-IN')}`,
        timestamp: timeAgo,
      });
    });

    // Add recent loans
    const sortedLoans = [...loans]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3);

    sortedLoans.forEach(loan => {
      const borrower = borrowers.find(b => b.id === loan.borrowerId);
      const createdDate = loan.createdAt ? new Date(loan.createdAt) : new Date();
      const timeAgo = getTimeAgo(createdDate);
      
      allActivities.push({
        id: loan.id,
        type: 'system',
        title: `New Loan Created - ${borrower?.name || 'Unknown'}`,
        description: `Principal amount at ${loan.interestRate}% interest`,
        amount: `₹${parseFloat(loan.principalAmount).toLocaleString('en-IN')}`,
        timestamp: timeAgo,
      });
    });

    // Sort all activities by most recent
    return allActivities
      .sort((a, b) => {
        const timeA = parseTimeAgo(a.timestamp);
        const timeB = parseTimeAgo(b.timestamp);
        return timeA - timeB;
      })
      .slice(0, 8);
  }, [payments, loans, borrowers]);

  // Calculate loan status distribution for pie chart
  const loanStatusData = useMemo(() => {
    const statusCounts = loans.reduce((acc, loan) => {
      const status = loan.status || 'active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'active' ? '#3B82F6' : status === 'settled' ? '#10B981' : '#EF4444',
    }));
  }, [loans]);

  // Calculate monthly interest earned for area chart
  const monthlyInterestData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: { [key: string]: number } = {};
    
    // Initialize last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[date.getMonth()]}`;
      months[key] = 0;
    }

    // Aggregate interest entries by month
    interestEntries.forEach(entry => {
      const entryDate = new Date(entry.periodEnd);
      const monthKey = monthNames[entryDate.getMonth()];
      if (months[monthKey] !== undefined) {
        months[monthKey] += parseFloat(entry.interestAmount);
      }
    });

    return Object.entries(months).map(([month, amount]) => ({
      month,
      interest: Math.round(amount),
    }));
  }, [interestEntries]);

  // Calculate additional metrics
  const additionalMetrics = useMemo(() => {
    const totalLoans = loans.length;
    const avgLoanSize = totalLoans > 0 
      ? loans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0) / totalLoans 
      : 0;
    
    const avgInterestRate = totalLoans > 0
      ? loans.reduce((sum, loan) => sum + parseFloat(loan.interestRate), 0) / totalLoans
      : 0;
    
    const totalInterestEarned = interestEntries.reduce((sum, entry) => sum + parseFloat(entry.interestAmount), 0);
    
    return {
      avgLoanSize,
      avgInterestRate,
      totalInterestEarned,
    };
  }, [loans, interestEntries]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return '₹0';
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const handleViewDetails = (borrowerId: string) => {
    // Navigate to borrower details page
    window.location.href = `/borrowers?id=${borrowerId}`;
  };

  const handleAddPayment = (borrowerId: string) => {
    setSelectedBorrowerId(borrowerId);
    setPaymentModalOpen(true);
  };

  const handleSendReminder = (borrowerId: string) => {
    // Navigate to reminders page with borrower pre-selected
    window.location.href = `/reminders?borrowerId=${borrowerId}`;
  };

  const handleQuickPayment = () => {
    setSelectedBorrowerId(null); // No pre-selected borrower
    setPaymentModalOpen(true);
  };

  const avatars = [avatar1, avatar2, avatar3];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your lending portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setBorrowerModalOpen(true)} data-testid="button-add-borrower">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Borrower
          </Button>
          <Button variant="outline" onClick={handleQuickPayment} data-testid="button-quick-payment">
            <Plus className="h-4 w-4 mr-2" />
            Quick Payment
          </Button>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-card-${i}`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Amount Lent"
            value={formatCurrency(stats?.totalLent || 0) || "₹0"}
            subValue="All time"
            icon={LucideIndianRupee}
            iconColor="bg-blue-500"
            data-testid="card-total-lent"
          />
          <SummaryCard
            title="Outstanding Principal"
            value={stats?.totalOutstanding || "₹0"}
            icon={Banknote}
            iconColor="bg-orange-500"
            data-testid="card-outstanding"
          />
          <SummaryCard
            title="Pending Interest"
            value={stats?.totalPendingInterest || "₹0"}
            icon={TrendingUp}
            iconColor="bg-green-500"
            data-testid="card-pending-interest"
          />
          <SummaryCard
            title="Active Borrowers"
            value={String(stats?.activeBorrowers || 0)}
            subValue={`${borrowers.length} total`}
            icon={Users}
            iconColor="bg-purple-500"
            data-testid="card-active-borrowers"
          />
        </div>
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Loan Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-avg-loan-size">
              ₹{additionalMetrics.avgLoanSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {loans.length} loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Interest Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-avg-interest-rate">
              {additionalMetrics.avgInterestRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Interest Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600" data-testid="text-total-interest-earned">
              ₹{additionalMetrics.totalInterestEarned.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {interestEntries.length} interest entries
            </p>
          </CardContent>
        </Card>
      </div>

      {borrowersLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : borrowers.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Borrowers Yet</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first borrower</p>
          <Button onClick={() => setBorrowerModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Your First Borrower
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: '500px' }}>
            <div className="lg:col-span-2 h-full">
              <InterestChart
                title={`Payment Trends (Last ${chartTimeRange === 1 ? '1 Month' : chartTimeRange === 3 ? '3 Months' : chartTimeRange === 6 ? '6 Months' : '1 Year'})`}
                data={chartData}
                timeRange={chartTimeRange}
                onTimeRangeChange={setChartTimeRange}
                onExport={() => console.log('Export chart')}
              />
            </div>
            <div className="h-full">
              <ActivityFeed activities={activities} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Loan Status Distribution
                </CardTitle>
                <CardDescription>Breakdown of loans by status</CardDescription>
              </CardHeader>
              <CardContent>
                {loanStatusData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No loan data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={loanStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {loanStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Interest Earned
                </CardTitle>
                <CardDescription>Interest accumulated over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyInterestData.every(d => d.interest === 0) ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No interest data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyInterestData}>
                      <defs>
                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Interest']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="interest" 
                        stroke="#10B981" 
                        fillOpacity={1} 
                        fill="url(#colorInterest)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Borrowers</h2>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all">All ({borrowers.length})</TabsTrigger>
                  <TabsTrigger value="active" data-testid="tab-active">
                    Active ({borrowers.filter((b) => b.status === 'active').length})
                  </TabsTrigger>
                  <TabsTrigger value="overdue" data-testid="tab-overdue">
                    Overdue ({borrowers.filter((b) => b.status === 'overdue').length})
                  </TabsTrigger>
                  <TabsTrigger value="settled" data-testid="tab-settled">
                    Settled ({borrowers.filter((b) => b.status === 'settled').length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {['all', 'active', 'overdue', 'settled'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {borrowers
                      .filter((b) => tab === 'all' || b.status === tab)
                      .map((borrower, index) => {
                        const borrowerLoans = loans.filter((l) => l.borrowerId === borrower.id);
                        const borrowerPayments = payments.filter((p) => 
                          borrowerLoans.some((l) => l.id === p.loanId)
                        );
                        const borrowerInterest = interestEntries.filter((i) => i.borrowerId === borrower.id);
                        
                        const totalLent = borrowerLoans.reduce((sum, loan) => sum + (parseFloat(loan.principalAmount) || 0), 0);
                        const totalInterestGenerated = borrowerInterest.reduce((sum, entry) => sum + (parseFloat(entry.interestAmount) || 0), 0);
                        
                        // Calculate payments allocation
                        let principalPaid = 0;
                        let interestPaid = 0;
                        
                        borrowerPayments.forEach(payment => {
                          const amount = parseFloat(payment.amount) || 0;
                          // Always apply payment to interest first, then principal
                          const pendingInterestAtTime = totalInterestGenerated - interestPaid;
                          const toInterest = Math.min(amount, Math.max(0, pendingInterestAtTime));
                          const toPrincipal = amount - toInterest;
                          interestPaid += toInterest;
                          principalPaid += toPrincipal;
                        });
                        
                        const outstanding = totalLent - principalPaid;
                        const pendingInterest = totalInterestGenerated - interestPaid;
                        const totalPaidAmount = borrowerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                        
                        const lastPayment = borrowerPayments.sort((a, b) => 
                          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                        )[0];
                        
                        return (
                          <BorrowerCard
                            key={borrower.id}
                            id={borrower.id}
                            name={borrower.name}
                            email={borrower.email}
                            phone={borrower.phone}
                            avatar={avatars[index % 3]}
                            totalLent={formatCurrency(totalLent)}
                            outstanding={formatCurrency(outstanding)}
                            interestEarned={`₹${totalInterestGenerated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            pendingInterest={`₹${pendingInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            totalPaid={`₹${totalPaidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            paymentCount={borrowerPayments.length}
                            lastPayment={lastPayment ? {
                              date: new Date(lastPayment.paymentDate).toISOString().split('T')[0],
                              amount: `₹${parseFloat(lastPayment.amount).toLocaleString('en-IN')}`
                            } : undefined}
                            daysSincePayment={lastPayment ? 
                              Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
                              : 0}
                            status={borrower.status as 'active' | 'overdue' | 'settled'}
                            onViewDetails={handleViewDetails}
                            onAddPayment={handleAddPayment}
                            onSendReminder={handleSendReminder}
                          />
                        );
                      })}
                    {borrowers.filter((b) => tab === 'all' || b.status === tab).length === 0 && (
                      <div className="col-span-2 p-12 text-center text-muted-foreground">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>No {tab === 'all' ? '' : tab} borrowers</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}

      <AddPaymentModal 
        open={paymentModalOpen} 
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedBorrowerId(null);
        }}
        preSelectedBorrowerId={selectedBorrowerId}
      />
      <AddBorrowerModal open={borrowerModalOpen} onClose={() => setBorrowerModalOpen(false)} />
    </div>
  );
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

// Helper function to parse time ago string to seconds for sorting
function parseTimeAgo(timeAgo: string): number {
  if (timeAgo === 'Just now') return 0;
  const match = timeAgo.match(/(\d+)\s+(\w+)/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit.startsWith('minute')) return value * 60;
  if (unit.startsWith('hour')) return value * 3600;
  if (unit.startsWith('day')) return value * 86400;
  if (unit.startsWith('week')) return value * 604800;
  if (unit.startsWith('month')) return value * 2592000;
  return 0;
}
