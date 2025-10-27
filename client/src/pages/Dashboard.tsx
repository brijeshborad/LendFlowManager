import { useState } from "react";
import { DollarSign, TrendingUp, Users, Banknote, Plus, UserPlus } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { BorrowerCard } from "@/components/BorrowerCard";
import { InterestChart } from "@/components/InterestChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Dashboard() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [borrowerModalOpen, setBorrowerModalOpen] = useState(false);

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Amount Lent"
          value="₹45.2L"
          subValue="All time"
          icon={DollarSign}
          iconColor="bg-blue-500"
        />
        <SummaryCard
          title="Outstanding Principal"
          value="₹32.8L"
          trend="down"
          trendValue="8.2%"
          icon={Banknote}
          iconColor="bg-orange-500"
        />
        <SummaryCard
          title="Interest Received"
          value="₹8.4L"
          trend="up"
          trendValue="12.5%"
          icon={TrendingUp}
          iconColor="bg-green-500"
        />
        <SummaryCard
          title="Active Borrowers"
          value="12"
          subValue="8 active loans"
          icon={Users}
          iconColor="bg-purple-500"
        />
      </div>

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
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue">Overdue</TabsTrigger>
              <TabsTrigger value="settled" data-testid="tab-settled">Settled</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockBorrowers.map((borrower) => (
                <BorrowerCard key={borrower.id} {...borrower} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockBorrowers
                .filter((b) => b.status === 'active')
                .map((borrower) => (
                  <BorrowerCard key={borrower.id} {...borrower} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockBorrowers
                .filter((b) => b.status === 'overdue')
                .map((borrower) => (
                  <BorrowerCard key={borrower.id} {...borrower} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="settled" className="mt-0">
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No settled borrowers yet</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
