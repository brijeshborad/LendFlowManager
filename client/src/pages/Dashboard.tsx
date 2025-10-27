import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Users, Banknote, Plus, UserPlus } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { BorrowerCard } from "@/components/BorrowerCard";
import { InterestChart } from "@/components/InterestChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Borrower, Loan, Payment } from "@shared/schema";
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

  // Generate dynamic chart data from last 6 months of payments
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: { [key: string]: { received: number; pending: number } } = {};
    
    // Initialize last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
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
    const totalOutstanding = parseFloat(stats?.totalOutstanding || '0');
    const monthlyPending = totalOutstanding * 0.01; // Approximate 1% monthly
    
    return Object.entries(months).map(([month, data]) => ({
      month,
      received: Math.round(data.received),
      pending: Math.round(monthlyPending),
    }));
  }, [payments, stats]);

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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `₹${(num / 100000).toFixed(1)}L`;
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
          <Button variant="outline" onClick={() => setPaymentModalOpen(true)} data-testid="button-quick-payment">
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
            value={stats?.totalLent || "₹0"}
            subValue="All time"
            icon={DollarSign}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InterestChart
                title="Payment Trends (Last 6 Months)"
                data={chartData}
                onExport={() => console.log('Export chart')}
              />
            </div>
            <ActivityFeed activities={activities} />
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
                        
                        const totalLent = borrowerLoans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0);
                        const totalPaid = borrowerPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
                        const outstanding = totalLent - totalPaid;
                        
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
                            pendingInterest="₹0"
                            lastPayment={lastPayment ? {
                              date: new Date(lastPayment.paymentDate).toISOString().split('T')[0],
                              amount: `₹${parseFloat(lastPayment.amount).toLocaleString('en-IN')}`
                            } : undefined}
                            daysSincePayment={lastPayment ? 
                              Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
                              : 0}
                            status={borrower.status as 'active' | 'overdue' | 'settled'}
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

      <AddPaymentModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} />
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
