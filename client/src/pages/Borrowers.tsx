import { Users } from "lucide-react";

export default function Borrowers() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Borrowers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your borrowers and their details
          </p>
        </div>
      </div>

      <div className="p-12 text-center border rounded-lg">
        <Users className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Borrowers Page Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          For now, you can manage borrowers from the Dashboard
        </p>
      </div>
    </div>
  );
}
