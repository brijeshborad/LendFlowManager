import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import type { Borrower } from "@shared/schema";

export default function PendingInterestCalculator() {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>("");
  const [tillDate, setTillDate] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: borrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['/api/borrowers'],
  });

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
    const year = dateObj.getFullYear();
    
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';
    
    return `${day}${suffix} ${month}, ${year}`;
  };

  const calculatePendingInterest = async () => {
    if (!selectedBorrowerId || !tillDate) return;
    
    setLoading(true);
    try {
      const response = await apiRequest("GET", `/api/reports/pending-interest?borrowerId=${selectedBorrowerId}&tillDate=${tillDate}`);
      console.log(response);
      setResult(response);
    } catch (error) {
      console.error("Error calculating pending interest:", error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Pending Interest Calculator</h1>
        <p className="text-muted-foreground mt-1">
          Calculate pending interest for a borrower till a specific date
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Interest Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="borrower">Select Borrower</Label>
              <Select value={selectedBorrowerId} onValueChange={setSelectedBorrowerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose borrower" />
                </SelectTrigger>
                <SelectContent>
                  {borrowers.map((borrower) => (
                    <SelectItem key={borrower.id} value={borrower.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {borrower.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tillDate">Till Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tillDate"
                  type="date"
                  value={tillDate}
                  onChange={(e) => setTillDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={calculatePendingInterest}
                disabled={!selectedBorrowerId || !tillDate || loading}
                className="w-full"
              >
                {loading ? "Calculating..." : "Calculate Interest"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Interest Calculation Result</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pending interest till {formatDate(result.tillDate)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pending Interest</p>
                <p className="text-3xl font-bold text-red-600">
                  {result.totalPendingInterest}
                </p>
              </div>
            </div>

            {result.loanDetails && result.loanDetails.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loan-wise Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Interest Till Date</TableHead>
                      <TableHead>Interest Paid</TableHead>
                      <TableHead>Pending Interest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.loanDetails.map((loan: any, index: number) => (
                      <TableRow key={loan.loanId || index}>
                        <TableCell className="font-mono">{formatCurrency(loan.principalAmount)}</TableCell>
                        <TableCell className="font-mono">{loan.interestRate || 0}%</TableCell>
                        <TableCell>{formatDate(loan.startDate)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(loan.totalInterestTillDate)}</TableCell>
                        <TableCell className="font-mono text-green-600">{formatCurrency(loan.interestPaidTillDate)}</TableCell>
                        <TableCell className="font-mono text-red-600 font-semibold">{formatCurrency(loan.pendingInterest)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
