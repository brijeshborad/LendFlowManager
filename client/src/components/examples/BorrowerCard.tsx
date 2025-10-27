import { BorrowerCard } from '../BorrowerCard';
import avatar1 from '@assets/generated_images/Professional_male_avatar_headshot_3c69c06f.png';
import avatar2 from '@assets/generated_images/Professional_female_avatar_headshot_d7c69081.png';

export default function BorrowerCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <BorrowerCard
        id="1"
        name="Rajesh Kumar"
        email="rajesh.k@example.com"
        phone="+91 98765 43210"
        avatar={avatar1}
        totalLent="₹15.5L"
        outstanding="₹12.3L"
        pendingInterest="₹2.4L"
        lastPayment={{ date: "2024-10-15", amount: "₹50,000" }}
        daysSincePayment={12}
        status="active"
      />
      <BorrowerCard
        id="2"
        name="Priya Sharma"
        email="priya.sharma@example.com"
        phone="+91 98123 45678"
        avatar={avatar2}
        totalLent="₹8.2L"
        outstanding="₹6.5L"
        pendingInterest="₹3.2L"
        lastPayment={{ date: "2024-08-20", amount: "₹25,000" }}
        daysSincePayment={68}
        status="overdue"
      />
    </div>
  );
}
