import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Calendar, User, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
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

  const showDetailedBreakdown = async (borrowerId: string, borrowerName: string) => {
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

  const generateIndividualReport = async (borrowerId: string, borrowerName: string) => {
    if (!tillDate) return;
    
    try {
      const response = await apiRequest("GET", `/api/reports/borrower-report?borrowerId=${borrowerId}&tillDate=${tillDate}`);
      const reportData = await response.json();
      
      const reportContent = generateReportContent(reportData);
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Interest_Report_${borrowerName}_${tillDate}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating individual report:", error);
    }
  };

  const generateReport = async () => {
    if (!selectedBorrowerId || selectedBorrowerId === "all" || !tillDate || !result) return;
    
    try {
      const response = await apiRequest("GET", `/api/reports/borrower-report?borrowerId=${selectedBorrowerId}&tillDate=${tillDate}`);
      const reportData = await response.json();
      
      // Create and download the report
      const reportContent = generateReportContent(reportData);
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Interest_Report_${reportData.borrowerName}_${tillDate}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  const generateReportContent = (data: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Interest Statement - ${data.borrowerName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .report-title { font-size: 18px; color: #666; }
        .borrower-info { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .summary { margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; }
        .info-row { display: flex; gap: 20px; margin: 20px 0; }
        .info-box { flex: 1; padding: 15px; border-radius: 5px; }
        .borrower-box { background: #f5f5f5; }
        .loan-box { background: #e3f2fd; }
        .summary-box { background: #fff3cd; border-left: 4px solid #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; text-align: center; }
        .amount { text-align: right; font-family: monospace; }
        .pending { color: #dc3545; font-weight: bold; }
        .paid { color: #28a745; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">LendFlow Manager</div>
        <div class="report-title">Interest Statement Report</div>
        <div>Generated on: ${formatDate(new Date())}</div>
    </div>
    
    <div class="info-row">
        <div class="info-box borrower-box">
            <h3>Borrower Information</h3>
            <p><strong>Name:</strong> ${data.borrowerName}</p>
            <p><strong>Report Period:</strong> Till ${formatDate(data.tillDate)}</p>
            <p><strong>Total Loans:</strong> ${data.totalLoans}</p>
        </div>
        
        ${data.loanDetails && data.loanDetails.length > 0 ? data.loanDetails.map((loan: any) => `
        <div class="info-box loan-box">
            <h3>Loan Details</h3>
            <p><strong>Start Date:</strong> ${loan.startDate}</p>
            <p><strong>Principal Amount:</strong> ₹${loan.principalAmount.toLocaleString('en-IN')}</p>
            <p><strong>Interest Rate:</strong> ${loan.interestRate}% ${loan.interestRateType}</p>
        </div>
        `).join('') : ''}
        
        <div class="info-box summary-box">
            <h3>Summary</h3>
            <p><strong>Total Interest Generated:</strong> <span class="amount">₹${data.totalInterestGenerated.toLocaleString('en-IN')}</span></p>
            <p><strong>Total Interest Paid:</strong> <span class="amount paid">₹${data.totalInterestPaid.toLocaleString('en-IN')}</span></p>
            <p><strong>Pending Interest:</strong> <span class="amount pending">₹${data.totalPendingInterest.toLocaleString('en-IN')}</span></p>
        </div>
    </div>
    
    ${data.loanDetails && data.loanDetails.length > 0 ? data.loanDetails.map((loan: any, index: number) => {
      const loanBreakdown = data.monthlyBreakdown.filter((month: any) => month.loanId === loan.loanId);
      return `
    <h3>Loan ${index + 1} - Monthly Interest Breakdown</h3>
    <div style="margin-bottom: 10px; padding: 10px; background: #e3f2fd; border-radius: 5px;">
        <strong>Start Date:</strong> ${loan.startDate} | 
        <strong>Principal:</strong> ₹${loan.principalAmount.toLocaleString('en-IN')} | 
        <strong>Rate:</strong> ${loan.interestRate}% ${loan.interestRateType}
    </div>
    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Month</th>
                <th style="text-align: center;">Days</th>
                <th style="text-align: right;">Principal Balance</th>
                <th style="text-align: right;">Monthly Interest</th>
                <th style="text-align: right;">Cumulative Interest</th>
                <th style="text-align: right;">Interest Paid (Month)</th>
                <th style="text-align: right;">Principal Paid (Month)</th>
                <th style="text-align: right;">Cumulative Paid</th>
                <th style="text-align: right;">Pending Interest</th>
            </tr>
        </thead>
        <tbody>
            ${loanBreakdown.map((month: any) => `
            <tr>
                <td>${month.month}</td>
                <td style="text-align: center;">${month.daysInMonth}</td>
                <td class="amount">₹${month.principalBalance.toLocaleString('en-IN')}</td>
                <td class="amount">₹${month.monthlyInterest.toLocaleString('en-IN')}</td>
                <td class="amount">₹${month.cumulativeInterest.toLocaleString('en-IN')}</td>
                <td class="amount paid">₹${month.monthInterestPaid.toLocaleString('en-IN')}</td>
                <td class="amount" style="color: #007bff;">₹${month.monthPrincipalPaid.toLocaleString('en-IN')}</td>
                <td class="amount paid">₹${month.cumulativePaid.toLocaleString('en-IN')}</td>
                <td class="amount pending">₹${month.pendingInterest.toLocaleString('en-IN')}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
      `;
    }).join('') : ''}
    
    <div class="footer">
        <p>This is a computer-generated report. For any queries, please contact your loan officer.</p>
        <p>Report generated by LendFlow Manager on ${new Date().toLocaleString('en-IN')}</p>
    </div>
</body>
</html>
    `;
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
                  {formatCurrency(result.totalPendingInterest)}
                </p>
              </div>
            </div>

            {selectedBorrowerId !== "all" && result && (
              <div className="mt-4">
                <Button 
                  onClick={generateReport}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report for Borrower
                </Button>
              </div>
            )}

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
                                onClick={() => showDetailedBreakdown(borrower.borrowerId, borrower.borrowerName)}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                onClick={() => generateIndividualReport(borrower.borrowerId, borrower.borrowerName)}
                                variant="outline"
                                size="sm"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Report
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
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monthly Interest Breakdown - {modalData?.borrowerName}</DialogTitle>
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
