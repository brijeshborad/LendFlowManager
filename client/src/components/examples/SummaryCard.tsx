import { SummaryCard } from '../SummaryCard';
import { LucideIndianRupee, TrendingUp, Users, Banknote } from "lucide-react";

export default function SummaryCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 p-6">
      <SummaryCard
        title="Total Amount Lent"
        value="₹45.2L"
        subValue="All time"
        icon={LucideIndianRupee}
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
  );
}
