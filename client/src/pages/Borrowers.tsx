import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddBorrowerModal } from "@/components/AddBorrowerModal";
import type { Borrower } from "@shared/schema";

export default function Borrowers() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);

  const { data: borrowers = [], isLoading } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });
  
  const { data: loans = [] } = useQuery({
    queryKey: ['/api/loans'],
  });
  
  const { data: payments = [] } = useQuery({
    queryKey: ['/api/payments'],
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setSelectedBorrowerId(id);
  }, []);
  
  const selectedBorrower = borrowers.find(b => b.id === selectedBorrowerId);
  const borrowerLoans = loans.filter((l: any) => l.borrowerId === selectedBorrowerId);
  const borrowerPayments = payments.filter((p: any) => borrowerLoans.some((l: any) => l.id === p.loanId));

  if (selectedBorrower) {
    return (
      <div className="p-8 space-y-6">
        <Button variant="ghost" onClick={() => setSelectedBorrowerId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Borrowers
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">{selectedBorrower.name}</h1>
          <p className="text-muted-foreground mt-1">{selectedBorrower.email} • {selectedBorrower.phone}</p>
        </div>
        
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Payment History</h2>
          </CardHeader>
          <CardContent>
            {borrowerPayments.length === 0 ? (
              <p className="text-muted-foreground">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {borrowerPayments.map((payment: any) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-semibold">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-muted-foreground">{payment.paymentType} • {payment.paymentMethod}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Borrowers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your borrowers and their details
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} data-testid="button-add-borrower">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Borrower
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-borrower-${i}`} />
          ))}
        </div>
      ) : borrowers.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <UserPlus className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Borrowers Yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first borrower
          </p>
          <Button onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Your First Borrower
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {borrowers.map((borrower) => (
            <Card key={borrower.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedBorrowerId(borrower.id)} data-testid={`card-borrower-${borrower.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {borrower.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-borrower-name-${borrower.id}`}>
                        {borrower.name}
                      </h3>
                      <Badge 
                        variant={
                          borrower.status === 'active' ? 'default' : 
                          borrower.status === 'overdue' ? 'destructive' : 
                          'secondary'
                        }
                        className="text-xs mt-1"
                        data-testid={`badge-status-${borrower.id}`}
                      >
                        {borrower.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span data-testid={`text-email-${borrower.id}`}>{borrower.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span data-testid={`text-phone-${borrower.id}`}>{borrower.phone}</span>
                </div>
                {borrower.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1" data-testid={`text-address-${borrower.id}`}>
                      {borrower.address}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBorrowerModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
