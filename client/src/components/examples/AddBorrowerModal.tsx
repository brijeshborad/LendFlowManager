import { useState } from 'react';
import { AddBorrowerModal } from '../AddBorrowerModal';
import { Button } from '@/components/ui/button';

export default function AddBorrowerModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Add Borrower</Button>
      <AddBorrowerModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
