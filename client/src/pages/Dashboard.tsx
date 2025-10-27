import { useState } from "react";
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

// todo: remove mock functionality
const mockChartData = [
  { month: 'May', received: 65000, pending: 45000 },
  { month: 'Jun', received: 72000, pending: 52000 },
  { month: 'Jul', received: 68000, pending: 48000 },
  { month: 'Aug', received: 85000, pending: 65000 },
  { month: 'Sep', received: 92000, pending: 72000 },
  { month: 'Oct', received: 84000, pending: 68000 },
];

const mockActivities = [
  {
    id: '1',
    type: 'payment' as const,
    title: 'Payment Received - Rajesh Kumar',
    description: 'Principal payment received via UPI',
    amount: '₹50,000',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'alert' as const,
    title: 'High Pending Interest Alert',
    description: 'Priya Sharma has ₹3.2L pending interest (>3 months)',
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    type: 'reminder' as const,
    title: 'Email Reminder Sent',
    description: 'Payment reminder sent to Amit Patel',
    timestamp: '1 day ago',
  },
  {
    id: '4',
    type: 'payment' as const,
    title: 'Interest Payment - Neha Gupta',
    description: 'Partial interest payment via bank transfer',
    amount: '₹25,000',
    timestamp: '2 days ago',
  },
];

const mockBorrowers = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.k@example.com',
    phone: '+91 98765 43210',
    avatar: avatar1,
    totalLent: '₹15.5L',
    outstanding: '₹12.3L',
    pendingInterest: '₹2.4L',
    lastPayment: { date: '2024-10-15', amount: '₹50,000' },
    daysSincePayment: 12,
    status: 'active' as const,
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 98123 45678',
    avatar: avatar2,
    totalLent: '₹8.2L',
    outstanding: '₹6.5L',
    pendingInterest: '₹3.2L',
    lastPayment: { date: '2024-08-20', amount: '₹25,000' },
    daysSincePayment: 68,
    status: 'overdue' as const,
  },
  {
    id: '3',
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    phone: '+91 99988 77766',
    avatar: avatar3,
    totalLent: '₹12.0L',
    outstanding: '₹9.8L',
    pendingInterest: '₹1.8L',
    lastPayment: { date: '2024-09-30', amount: '₹75,000' },
    daysSincePayment: 27,
    status: 'active' as const,
  },
];

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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `₹${(num / 100000).toFixed(1)}L`;
  };

  // Helper avatar images
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
            trend="down"
            trendValue="8.2%"
            icon={Banknote}
            iconColor="bg-orange-500"
            data-testid="card-outstanding"
          />
          <SummaryCard
            title="Pending Interest"
            value={stats?.totalPendingInterest || "₹0"}
            trend="up"
            trendValue="12.5%"
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
                title="Interest Trends (Last 6 Months)"
                data={mockChartData}
                onExport={() => console.log('Export chart')}
              />
            </div>
            <ActivityFeed activities={mockActivities} />
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

              <TabsContent value="all" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {borrowers.map((borrower, index) => {
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
                          : undefined}
                        status={borrower.status as 'active' | 'overdue' | 'settled'}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {borrowers.filter((b) => b.status === 'active').length === 0 ? (
                    <div className="col-span-2 p-12 text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No active borrowers</p>
                    </div>
                  ) : (
                    borrowers
                      .filter((b) => b.status === 'active')
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
                              : undefined}
                            status="active"
                          />
                        );
                      })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="overdue" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {borrowers.filter((b) => b.status === 'overdue').length === 0 ? (
                    <div className="col-span-2 p-12 text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No overdue borrowers</p>
                    </div>
                  ) : (
                    borrowers
                      .filter((b) => b.status === 'overdue')
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
                              : undefined}
                            status="overdue"
                          />
                        );
                      })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settled" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {borrowers.filter((b) => b.status === 'settled').length === 0 ? (
                    <div className="col-span-2 p-12 text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No settled borrowers yet</p>
                    </div>
                  ) : (
                    borrowers
                      .filter((b) => b.status === 'settled')
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
                              : undefined}
                            status="settled"
                          />
                        );
                      })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      <AddPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        borrowerName="Select Borrower"
        pendingInterest="₹0"
      />

      <AddBorrowerModal
        open={borrowerModalOpen}
        onClose={() => setBorrowerModalOpen(false)}
      />
    </div>
  );
}
