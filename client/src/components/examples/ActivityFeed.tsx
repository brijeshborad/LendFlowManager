import { ActivityFeed } from '../ActivityFeed';

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

export default function ActivityFeedExample() {
  return (
    <div className="p-6 max-w-md">
      <ActivityFeed activities={mockActivities} />
    </div>
  );
}
