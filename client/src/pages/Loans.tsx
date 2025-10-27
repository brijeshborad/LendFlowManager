import { Wallet } from "lucide-react";

export default function Loans() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Loans</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all loans
          </p>
        </div>
      </div>

      <div className="p-12 text-center border rounded-lg">
        <Wallet className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Loans Page Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Detailed loan management interface is under development
        </p>
      </div>
    </div>
  );
}
