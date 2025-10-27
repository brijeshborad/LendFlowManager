import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AddBorrowerModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddBorrowerModal({ open, onClose }: AddBorrowerModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [contactMethod, setContactMethod] = useState("");

  const createBorrowerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; address?: string; metadata?: any }) => {
      const response = await apiRequest("POST", "/api/borrowers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Borrower added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add borrower",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setNotes("");
    setContactMethod("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const metadata: any = {};
    if (contactMethod) {
      metadata.preferredContactMethod = contactMethod;
    }
    if (notes) {
      metadata.notes = notes;
    }

    createBorrowerMutation.mutate({
      name,
      email,
      phone,
      address: address || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  };

  const handleClose = () => {
    if (!createBorrowerMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-add-borrower">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
          <DialogDescription>
            Enter borrower details. Email is required for automated reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrower-name">Full Name *</Label>
                <Input
                  id="borrower-name"
                  placeholder="Rajesh Kumar"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-borrower-name"
                  disabled={createBorrowerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rajesh@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  disabled={createBorrowerMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-phone"
                  disabled={createBorrowerMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-method">Preferred Contact Method</Label>
                <Select 
                  value={contactMethod} 
                  onValueChange={setContactMethod}
                  disabled={createBorrowerMutation.isPending}
                >
                  <SelectTrigger id="contact-method" data-testid="select-contact-method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-address"
                disabled={createBorrowerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="borrower-notes">Notes (Optional)</Label>
              <Textarea
                id="borrower-notes"
                placeholder="Additional information about the borrower..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="textarea-borrower-notes"
                disabled={createBorrowerMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              data-testid="button-cancel"
              disabled={createBorrowerMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              data-testid="button-submit-borrower"
              disabled={createBorrowerMutation.isPending}
            >
              {createBorrowerMutation.isPending ? "Adding..." : "Add Borrower"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
