import { useState } from 'react';
import { AddPaymentModal } from '../AddPaymentModal';
import { Button } from '@/components/ui/button';

export default function AddPaymentModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open Payment Modal</Button>
      <AddPaymentModal
        open={open}
        onClose={() => setOpen(false)}
        borrowerName="Rajesh Kumar"
        pendingInterest="₹2.4L"
      />
    </div>
  );
}
