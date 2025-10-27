import { NotificationPanel } from '../NotificationPanel';

const mockNotifications = [
  {
    id: '1',
    type: 'payment' as const,
    title: 'Payment Received',
    message: 'Rajesh Kumar paid ₹50,000 via UPI',
    timestamp: '2 minutes ago',
    read: false,
  },
  {
    id: '2',
    type: 'alert' as const,
    title: 'High Pending Interest',
    message: 'Priya Sharma has ₹3.2L pending interest',
    timestamp: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    type: 'reminder' as const,
    title: 'Email Sent',
    message: 'Payment reminder sent to Amit Patel',
    timestamp: '3 hours ago',
    read: true,
  },
];

export default function NotificationPanelExample() {
  return (
    <div className="p-6">
      <NotificationPanel
        notifications={mockNotifications}
        onMarkAsRead={(id) => console.log('Mark as read:', id)}
        onMarkAllAsRead={() => console.log('Mark all as read')}
        onDismiss={(id) => console.log('Dismiss:', id)}
      />
    </div>
  );
}
