import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Calendar, User, FileDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { generateInterestCalculatorPdf } from "@/lib/generateStatementPdf";
import type { Borrower } from "@shared/schema";

export default function PendingInterestCalculator() {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>("");
  const [tillDate, setTillDate] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const showDetailedBreakdown = async (borrowerId: string) => {
    if (!tillDate) return;

    try {
      const response = await apiRequest("GET", `/api/reports/borrower-report?borrowerId=${borrowerId}&tillDate=${tillDate}`);
      const reportData = await response.json();
      setModalData(reportData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching detailed breakdown:", error);
    }
  };

  const generateIndividualPdf = async (borrowerId: string) => {
    if (!tillDate) return;

    try {
      const response = await apiRequest("GET", `/api/reports/borrower-report?borrowerId=${borrowerId}&tillDate=${tillDate}`);
      const reportData = await response.json();

      // For single borrower from "all" view, use interest calculator PDF with detailed data
      const pendingResponse = await apiRequest("GET", `/api/reports/pending-interest?borrowerId=${borrowerId}&tillDate=${tillDate}`);
      const pendingData = await pendingResponse.json();

      generateInterestCalculatorPdf(
        pendingData,
        borrowers.map(b => ({ id: b.id, name: b.name })),
        tillDate,
        borrowerId,
        reportData
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const generatePdf = async () => {
    if (!selectedBorrowerId || !tillDate || !result) return;

    try {
      let reportData = undefined;
      if (selectedBorrowerId !== "all") {
        const response = await apiRequest("GET", `/api/reports/borrower-report?borrowerId=${selectedBorrowerId}&tillDate=${tillDate}`);
        reportData = await response.json();
      }

      generateInterestCalculatorPdf(
        result,
        borrowers.map(b => ({ id: b.id, name: b.name })),
        tillDate,
        selectedBorrowerId,
        reportData
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const calculatePendingInterest = async () => {
    if (!selectedBorrowerId || !tillDate) return;

    setLoading(true);
    try {
      const response = await apiRequest("GET", `/api/reports/pending-interest?borrowerId=${selectedBorrowerId}&tillDate=${tillDate}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error calculating pending interest:", error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Interest Calculator</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1">
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
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      All Borrowers
                    </div>
                  </SelectItem>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interest Calculation Result</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pending interest till {formatDate(result.tillDate)}
                </p>
              </div>
              <Button onClick={generatePdf} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pending Interest</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(result.totalPendingInterest)}
                </p>
              </div>
            </div>

            {selectedBorrowerId === "all" ? (
              result.borrowerDetails && result.borrowerDetails.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Borrower-wise Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Pending Interest</TableHead>
                        <TableHead>Loans</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.borrowerDetails.map((borrower: any, index: number) => (
                        <TableRow key={borrower.borrowerId || index}>
                          <TableCell className="font-medium">{borrower.borrowerName}</TableCell>
                          <TableCell className="font-mono text-red-600 font-semibold">{formatCurrency(borrower.totalPendingInterest)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{borrower.loanDetails.length} loan(s)</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => showDetailedBreakdown(borrower.borrowerId)}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                onClick={() => generateIndividualPdf(borrower.borrowerId)}
                                variant="outline"
                                size="sm"
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              result.loanDetails && result.loanDetails.length > 0 && (
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

                  {/* Summary totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Interest Generated</p>
                      <p className="text-lg font-bold font-mono text-blue-600">
                        {formatCurrency(result.loanDetails.reduce((sum: number, l: any) => sum + (l.totalInterestTillDate || 0), 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Interest Paid</p>
                      <p className="text-lg font-bold font-mono text-green-600">
                        {formatCurrency(result.loanDetails.reduce((sum: number, l: any) => sum + (l.interestPaidTillDate || 0), 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Pending Interest</p>
                      <p className="text-lg font-bold font-mono text-red-600">
                        {formatCurrency(result.totalPendingInterest)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Monthly Interest Breakdown - {modalData?.borrowerName}</DialogTitle>
              {modalData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Find borrower id from name
                    const borrower = borrowers.find(b => b.name === modalData.borrowerName);
                    if (borrower) generateIndividualPdf(borrower.id);
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          {modalData && (
            <div className="space-y-4">
              {modalData.loanDetails && modalData.loanDetails.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {modalData.loanDetails.map((loan: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-2">Loan Details</h4>
                        <p><strong>Start Date:</strong> {loan.startDate}</p>
                        <p><strong>Principal:</strong> {formatCurrency(loan.principalAmount)}</p>
                        <p><strong>Interest Rate:</strong> {loan.interestRate}% {loan.interestRateType}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Interest Generated</p>
                    <p className="font-mono">{formatCurrency(modalData.totalInterestGenerated)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Interest Paid</p>
                    <p className="font-mono text-green-600">{formatCurrency(modalData.totalInterestPaid)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending Interest</p>
                    <p className="font-mono text-red-600 font-semibold">{formatCurrency(modalData.totalPendingInterest)}</p>
                  </div>
                </div>
              </div>

              {modalData.monthlyBreakdown && modalData.monthlyBreakdown.length > 0 && modalData.loanDetails && modalData.loanDetails.length > 0 && (
                <div className="space-y-6">
                  {modalData.loanDetails.map((loan: any, index: number) => {
                    const loanBreakdown = modalData.monthlyBreakdown.filter((month: any) => month.loanId === loan.loanId);
                    return (
                      <div key={loan.loanId || index}>
                        <div className="flex items-center gap-4 mb-3">
                          <h4 className="font-semibold">Loan {index + 1} - Monthly Breakdown</h4>
                          <div className="text-sm text-muted-foreground">
                            Start: {loan.startDate} | Principal: {formatCurrency(loan.principalAmount)} | Rate: {loan.interestRate}% {loan.interestRateType}
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Principal Balance</TableHead>
                              <TableHead>Monthly Interest</TableHead>
                              <TableHead>Cumulative Interest</TableHead>
                              <TableHead>Interest Paid</TableHead>
                              <TableHead>Principal Paid</TableHead>
                              <TableHead>Cumulative Paid</TableHead>
                              <TableHead>Pending Interest</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanBreakdown.map((month: any, monthIndex: number) => (
                              <TableRow key={monthIndex}>
                                <TableCell>{month.month}</TableCell>
                                <TableCell className="font-mono text-center">{month.daysInMonth}</TableCell>
                                <TableCell className="font-mono text-right">{formatCurrency(month.principalBalance)}</TableCell>
                                <TableCell className="font-mono text-right">{formatCurrency(month.monthlyInterest)}</TableCell>
                                <TableCell className="font-mono text-right">{formatCurrency(month.cumulativeInterest)}</TableCell>
                                <TableCell className="font-mono text-green-600 text-right">{formatCurrency(month.monthInterestPaid)}</TableCell>
                                <TableCell className="font-mono text-blue-600 text-right">{formatCurrency(month.monthPrincipalPaid)}</TableCell>
                                <TableCell className="font-mono text-green-600 text-right">{formatCurrency(month.cumulativePaid)}</TableCell>
                                <TableCell className="font-mono text-red-600 font-semibold text-right">{formatCurrency(month.pendingInterest)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{month.calculationNote || ''}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
