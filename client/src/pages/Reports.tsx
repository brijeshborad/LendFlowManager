import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and view financial reports
          </p>
        </div>
      </div>

      <div className="p-12 text-center border rounded-lg">
        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Reports Page Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          PDF/Excel export and advanced reporting features are planned
        </p>
      </div>
    </div>
  );
}
