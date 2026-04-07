import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "0.00";
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "N/A";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "Invalid Date";
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString("en-IN", { month: "short" });
  const year = dateObj.getFullYear();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  return `${day}${suffix} ${month}, ${year}`;
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("LendFlow Manager", 14, 12);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 25);
  }

  // Generated date on right
  doc.setFontSize(9);
  doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - 14, 12, { align: "right" });

  return 34; // y position after header
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(title, 14, y);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, doc.internal.pageSize.getWidth() - 14, y + 2);
  return y + 8;
}

function addInfoRow(doc: jsPDF, y: number, label: string, value: string, valueColor?: [number, number, number]): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(label, 14, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(valueColor || COLORS.black));
  doc.text(value, 70, y);
  return y + 5.5;
}

function addSummaryBox(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; color?: [number, number, number] }[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 28 - (items.length - 1) * 4) / items.length;

  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(14, y - 4, pageWidth - 28, 22, 2, 2, "F");

  items.forEach((item, i) => {
    const x = 14 + i * (boxWidth + 4) + boxWidth / 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(item.label, x, y + 2, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(item.color || COLORS.black));
    doc.text(item.value, x, y + 12, { align: "center" });
  });

  return y + 24;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text("This is a computer-generated statement. For any queries, please contact your loan officer.", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    doc.text("LendFlow Manager", 14, pageHeight - 10);
  }
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 14;
  }
  return y;
}

interface PaymentRecord {
  loanId: string;
  paymentDate: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  interestClearedTillDate?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
}

interface LoanReportData {
  borrowerName: string;
  tillDate: string;
  totalLoans: number;
  totalInterestGenerated: number;
  totalInterestPaid: number;
  totalPendingInterest: number;
  loanDetails: {
    loanId: string;
    startDate: string;
    principalAmount: number;
    interestRate: number;
    interestRateType: string;
    monthlyInterest: number;
  }[];
  monthlyBreakdown: {
    loanId: string;
    month: string;
    daysInMonth: number;
    principalBalance: number;
    monthlyInterest: number;
    cumulativeInterest: number;
    monthInterestPaid: number;
    monthPrincipalPaid: number;
    cumulativePaid: number;
    pendingInterest: number;
    calculationNote?: string;
  }[];
  paymentHistory?: PaymentRecord[];
}

function formatPaymentType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPaymentMethod(method: string): string {
  if (method === "upi") return "UPI";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateLoanStatementPdf(
  reportData: LoanReportData,
  loanFilter?: string // specific loanId, or undefined for all loans
) {
  const data = reportData;
  const filteredLoans = loanFilter
    ? data.loanDetails.filter((l) => l.loanId === loanFilter)
    : data.loanDetails;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const loanLabel = filteredLoans.length === 1
    ? `Loan: ${formatCurrency(filteredLoans[0].principalAmount)} @ ${filteredLoans[0].interestRate}% ${filteredLoans[0].interestRateType}`
    : `${filteredLoans.length} Loan(s)`;

  let y = addHeader(doc, `Interest Statement - ${data.borrowerName}`, `Period: Till ${formatDate(data.tillDate)} | ${loanLabel}`);

  // Borrower & Loan Info - 2 column layout
  {
    const pageWidth = doc.internal.pageSize.getWidth();
    const colWidth = (pageWidth - 28 - 6) / 2; // 6mm gap between columns
    const leftX = 14;
    const rightX = 14 + colWidth + 6;
    const boxHeight = filteredLoans.length === 1 ? 28 : 20;

    // Left column - Borrower info
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(leftX, y - 2, colWidth, boxHeight, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("BORROWER", leftX + 4, y + 3);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.black);
    doc.text(data.borrowerName, leftX + 4, y + 9);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`Statement Till: ${formatDate(data.tillDate)}`, leftX + 4, y + 15);

    // Right column - Loan info
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightX, y - 2, colWidth, boxHeight, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("LOAN DETAILS", rightX + 4, y + 3);

    if (filteredLoans.length === 1) {
      const loan = filteredLoans[0];
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.black);
      doc.text(`Principal: Rs. ${formatCurrency(loan.principalAmount)}`, rightX + 4, y + 9);
      doc.text(`Rate: ${loan.interestRate}% ${loan.interestRateType}`, rightX + 4, y + 15);
      doc.text(`Start Date: ${loan.startDate}`, rightX + 4, y + 21);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.black);
      doc.text(`${filteredLoans.length} Loan(s)`, rightX + 4, y + 9);
      const totalPrincipal = filteredLoans.reduce((sum, l) => sum + l.principalAmount, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);
      doc.text(`Total Principal: Rs. ${formatCurrency(totalPrincipal)}`, rightX + 4, y + 15);
    }

    y += boxHeight + 4;
  }

  // Loan details table if multiple loans
  if (filteredLoans.length > 1) {
    y = addSectionTitle(doc, y, "Loan Summary");
    autoTable(doc, {
      startY: y,
      head: [["#", "Start Date", "Principal", "Interest Rate", "Monthly Interest"]],
      body: filteredLoans.map((loan, i) => [
        (i + 1).toString(),
        loan.startDate,
        formatCurrency(loan.principalAmount),
        `${loan.interestRate}% ${loan.interestRateType}`,
        formatCurrency(loan.monthlyInterest),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Calculate totals for filtered loans
  let totalInterest = 0;
  let totalPaid = 0;
  let totalPrincipalPaid = 0;

  for (const loan of filteredLoans) {
    const loanBreakdown = data.monthlyBreakdown.filter((m) => m.loanId === loan.loanId);
    if (loanBreakdown.length > 0) {
      const last = loanBreakdown[loanBreakdown.length - 1];
      totalInterest += last.cumulativeInterest;
      totalPaid += last.cumulativePaid;
    }
    totalPrincipalPaid += loanBreakdown.reduce((sum, m) => sum + m.monthPrincipalPaid, 0);
  }

  // Summary boxes
  y = checkPageBreak(doc, y, 30);
  y = addSummaryBox(doc, y, [
    { label: "TOTAL INTEREST GENERATED", value: `Rs. ${formatCurrency(totalInterest)}`, color: COLORS.primary },
    { label: "INTEREST PAID", value: `Rs. ${formatCurrency(totalPaid)}`, color: COLORS.green },
    { label: "PRINCIPAL REPAID", value: `Rs. ${formatCurrency(totalPrincipalPaid)}`, color: COLORS.primary },
    { label: "PENDING INTEREST", value: `Rs. ${formatCurrency(totalInterest - totalPaid)}`, color: COLORS.red },
  ]);
  y += 2;

  // Payment History per loan
  if (data.paymentHistory && data.paymentHistory.length > 0) {
    const loanIds = new Set(filteredLoans.map((l) => l.loanId));
    const filteredPayments = data.paymentHistory.filter((p) => loanIds.has(p.loanId));

    if (filteredPayments.length > 0) {
      for (let li = 0; li < filteredLoans.length; li++) {
        const loan = filteredLoans[li];
        const loanPayments = filteredPayments.filter((p) => p.loanId === loan.loanId);
        if (loanPayments.length === 0) continue;

        y = checkPageBreak(doc, y, 30);
        y = addSectionTitle(
          doc,
          y,
          filteredLoans.length > 1
            ? `Loan ${li + 1} - Payment History (Principal: Rs. ${formatCurrency(loan.principalAmount)})`
            : "Payment History"
        );

        const totalInterestPayments = loanPayments
          .filter((p) => p.paymentType === "interest" || p.paymentType === "partial_interest")
          .reduce((sum, p) => sum + p.amount, 0);
        const totalPrincipalPayments = loanPayments
          .filter((p) => p.paymentType === "principal")
          .reduce((sum, p) => sum + p.amount, 0);
        const totalMixedPayments = loanPayments
          .filter((p) => p.paymentType === "mixed")
          .reduce((sum, p) => sum + p.amount, 0);
        const totalAllPayments = loanPayments.reduce((sum, p) => sum + p.amount, 0);

        autoTable(doc, {
          startY: y,
          head: [["#", "Date", "Amount", "Type", "Method", "Interest Cleared Till", "Reference"]],
          body: loanPayments.map((p, i) => [
            (i + 1).toString(),
            formatDate(p.paymentDate),
            formatCurrency(p.amount),
            formatPaymentType(p.paymentType),
            formatPaymentMethod(p.paymentMethod),
            p.interestClearedTillDate ? formatDate(p.interestClearedTillDate) : "-",
            p.transactionReference || "-",
          ]),
          styles: { fontSize: 8.5, cellPadding: 1.5 },
          headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
          columnStyles: {
            0: { halign: "center", cellWidth: 10 },
            1: { halign: "left" },
            2: { halign: "right", fontStyle: "bold" },
            3: { halign: "center" },
            4: { halign: "center" },
            5: { halign: "left" },
            6: { halign: "left" },
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
          didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.column.index === 2) {
              const type = loanPayments[hookData.row.index]?.paymentType;
              if (type === "interest" || type === "partial_interest") {
                hookData.cell.styles.textColor = COLORS.green;
              } else if (type === "principal") {
                hookData.cell.styles.textColor = COLORS.primary;
              } else {
                hookData.cell.styles.textColor = COLORS.orange;
              }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Payment totals row
        y = checkPageBreak(doc, y, 14);
        doc.setFillColor(245, 245, 245);
        const pw = doc.internal.pageSize.getWidth();
        doc.roundedRect(14, y - 2, pw - 28, 12, 1, 1, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.black);
        doc.text("Payment Totals:", 18, y + 5);

        doc.setTextColor(...COLORS.green);
        doc.text(`Interest: Rs. ${formatCurrency(totalInterestPayments)}`, 60, y + 5);

        doc.setTextColor(...COLORS.primary);
        doc.text(`Principal: Rs. ${formatCurrency(totalPrincipalPayments)}`, 120, y + 5);

        if (totalMixedPayments > 0) {
          doc.setTextColor(...COLORS.orange);
          doc.text(`Mixed: Rs. ${formatCurrency(totalMixedPayments)}`, 180, y + 5);
        }

        doc.setTextColor(...COLORS.black);
        doc.text(`Total: Rs. ${formatCurrency(totalAllPayments)}`, 230, y + 5);

        y += 16;
      }
    }
  }

  // Monthly breakdown per loan
  for (let li = 0; li < filteredLoans.length; li++) {
    const loan = filteredLoans[li];
    const loanBreakdown = data.monthlyBreakdown.filter((m) => m.loanId === loan.loanId);
    if (loanBreakdown.length === 0) continue;

    y = checkPageBreak(doc, y, 30);
    y = addSectionTitle(
      doc,
      y,
      filteredLoans.length > 1
        ? `Loan ${li + 1} - Monthly Breakdown (Principal: Rs. ${formatCurrency(loan.principalAmount)} @ ${loan.interestRate}% ${loan.interestRateType})`
        : "Monthly Interest Breakdown"
    );

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Month",
          "Days",
          "Principal Balance",
          "Monthly Interest",
          "Cumulative Interest",
          "Interest Paid",
          "Principal Paid",
          "Cumulative Paid",
          "Pending Interest",
        ],
      ],
      body: loanBreakdown.map((m) => [
        m.month,
        m.daysInMonth.toString(),
        formatCurrency(m.principalBalance),
        formatCurrency(m.monthlyInterest),
        formatCurrency(m.cumulativeInterest),
        formatCurrency(m.monthInterestPaid),
        formatCurrency(m.monthPrincipalPaid),
        formatCurrency(m.cumulativePaid),
        formatCurrency(m.pendingInterest),
      ]),
      styles: { fontSize: 8.5, cellPadding: 1.5, halign: "right" },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData: any) => {
        // Color pending interest column red
        if (hookData.section === "body" && hookData.column.index === 8) {
          hookData.cell.styles.textColor = COLORS.red;
          hookData.cell.styles.fontStyle = "bold";
        }
        // Color paid columns green
        if (hookData.section === "body" && (hookData.column.index === 5 || hookData.column.index === 7)) {
          hookData.cell.styles.textColor = COLORS.green;
        }
        // Color principal paid blue
        if (hookData.section === "body" && hookData.column.index === 6) {
          hookData.cell.styles.textColor = COLORS.primary;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Per-loan totals row
    const last = loanBreakdown[loanBreakdown.length - 1];
    const loanPrincipalPaid = loanBreakdown.reduce((sum, m) => sum + m.monthPrincipalPaid, 0);

    y = checkPageBreak(doc, y, 16);
    doc.setFillColor(245, 245, 245);
    const pw = doc.internal.pageSize.getWidth();
    doc.roundedRect(14, y - 2, pw - 28, 12, 1, 1, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.black);
    doc.text("Loan Totals:", 18, y + 5);

    doc.setTextColor(...COLORS.primary);
    doc.text(`Interest: Rs. ${formatCurrency(last.cumulativeInterest)}`, 55, y + 5);

    doc.setTextColor(...COLORS.green);
    doc.text(`Paid: Rs. ${formatCurrency(last.cumulativePaid)}`, 115, y + 5);

    doc.setTextColor(...COLORS.primary);
    doc.text(`Principal Repaid: Rs. ${formatCurrency(loanPrincipalPaid)}`, 165, y + 5);

    doc.setTextColor(...COLORS.red);
    doc.text(`Pending: Rs. ${formatCurrency(last.pendingInterest)}`, 225, y + 5);

    y += 16;
  }

  // Grand totals section for multi-loan
  if (filteredLoans.length > 1) {
    y = checkPageBreak(doc, y, 30);
    y = addSectionTitle(doc, y, "Grand Totals");
    y = addSummaryBox(doc, y, [
      { label: "TOTAL INTEREST", value: `Rs. ${formatCurrency(totalInterest)}`, color: COLORS.primary },
      { label: "TOTAL PAID", value: `Rs. ${formatCurrency(totalPaid)}`, color: COLORS.green },
      { label: "TOTAL PRINCIPAL REPAID", value: `Rs. ${formatCurrency(totalPrincipalPaid)}`, color: COLORS.primary },
      { label: "TOTAL PENDING", value: `Rs. ${formatCurrency(totalInterest - totalPaid)}`, color: COLORS.red },
    ]);
  }

  addFooter(doc);

  const fileName = loanFilter
    ? `Statement_${data.borrowerName}_Loan_${formatDate(data.tillDate)}.pdf`
    : `Statement_${data.borrowerName}_All_Loans_${formatDate(data.tillDate)}.pdf`;

  doc.save(fileName.replace(/[,\s]+/g, "_"));
}

// For interest calculator - generates PDF from pending interest result
export function generateInterestCalculatorPdf(
  result: any,
  borrowers: { id: string; name: string }[],
  tillDate: string,
  selectedBorrowerId: string,
  reportData?: LoanReportData // detailed report data for single borrower
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const isAllBorrowers = selectedBorrowerId === "all";
  const borrowerName = isAllBorrowers
    ? "All Borrowers"
    : borrowers.find((b) => b.id === selectedBorrowerId)?.name || "Unknown";

  let y = addHeader(doc, `Interest Calculator Report`, `${borrowerName} | Till ${formatDate(tillDate)}`);

  // Total pending interest highlight
  y = addSummaryBox(doc, y, [
    {
      label: "TOTAL PENDING INTEREST",
      value: `Rs. ${formatCurrency(result.totalPendingInterest)}`,
      color: COLORS.red,
    },
  ]);
  y += 2;

  if (isAllBorrowers && result.borrowerDetails) {
    // All borrowers summary table
    y = addSectionTitle(doc, y, "Borrower-wise Breakdown");

    autoTable(doc, {
      startY: y,
      head: [["#", "Borrower", "Loans", "Pending Interest"]],
      body: result.borrowerDetails.map((b: any, i: number) => [
        (i + 1).toString(),
        b.borrowerName,
        b.loanDetails.length.toString(),
        formatCurrency(b.totalPendingInterest),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "right", fontStyle: "bold", textColor: COLORS.red },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      foot: [["", "", "Total", formatCurrency(result.totalPendingInterest)]],
      footStyles: { fillColor: [245, 245, 245], textColor: COLORS.red, fontStyle: "bold" },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Per-borrower loan details
    for (const borrower of result.borrowerDetails) {
      y = checkPageBreak(doc, y, 25);
      y = addSectionTitle(doc, y, borrower.borrowerName);

      autoTable(doc, {
        startY: y,
        head: [["Principal", "Rate", "Start Date", "Interest Till Date", "Interest Paid", "Pending Interest"]],
        body: borrower.loanDetails.map((loan: any) => [
          formatCurrency(loan.principalAmount),
          `${loan.interestRate}%`,
          formatDate(loan.startDate),
          formatCurrency(loan.totalInterestTillDate),
          formatCurrency(loan.interestPaidTillDate),
          formatCurrency(loan.pendingInterest),
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "right", cellWidth: 40 },
          1: { halign: "center", cellWidth: 20 },
          2: { halign: "left", cellWidth: 35 },
          3: { halign: "right", cellWidth: 40 },
          4: { halign: "right", cellWidth: 35, textColor: COLORS.green },
          5: { halign: "right", cellWidth: 35, textColor: COLORS.red, fontStyle: "bold" },
        },
        tableWidth: "wrap",
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  } else if (result.loanDetails) {
    // Single borrower - loan-wise breakdown
    y = addSectionTitle(doc, y, "Loan-wise Breakdown");

    autoTable(doc, {
      startY: y,
      head: [["Principal", "Rate", "Start Date", "Interest Till Date", "Interest Paid", "Pending Interest"]],
      body: result.loanDetails.map((loan: any) => [
        formatCurrency(loan.principalAmount),
        `${loan.interestRate}%`,
        formatDate(loan.startDate),
        formatCurrency(loan.totalInterestTillDate),
        formatCurrency(loan.interestPaidTillDate),
        formatCurrency(loan.pendingInterest),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "right", cellWidth: 40 },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "left", cellWidth: 35 },
        3: { halign: "right", cellWidth: 40 },
        4: { halign: "right", cellWidth: 35, textColor: COLORS.green },
        5: { halign: "right", cellWidth: 35, textColor: COLORS.red, fontStyle: "bold" },
      },
      tableWidth: "wrap",
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // If we have detailed report data, add payment history + monthly breakdown
    if (reportData) {
      // Payment History
      if (reportData.paymentHistory && reportData.paymentHistory.length > 0) {
        for (let li = 0; li < reportData.loanDetails.length; li++) {
          const loan = reportData.loanDetails[li];
          const loanPayments = reportData.paymentHistory.filter((p) => p.loanId === loan.loanId);
          if (loanPayments.length === 0) continue;

          y = checkPageBreak(doc, y, 30);
          y = addSectionTitle(
            doc,
            y,
            reportData.loanDetails.length > 1
              ? `Loan ${li + 1} - Payment History (Principal: Rs. ${formatCurrency(loan.principalAmount)})`
              : "Payment History"
          );

          autoTable(doc, {
            startY: y,
            head: [["#", "Date", "Amount", "Type", "Method", "Cleared Till", "Reference"]],
            body: loanPayments.map((p, i) => [
              (i + 1).toString(),
              formatDate(p.paymentDate),
              formatCurrency(p.amount),
              formatPaymentType(p.paymentType),
              formatPaymentMethod(p.paymentMethod),
              p.interestClearedTillDate ? formatDate(p.interestClearedTillDate) : "-",
              p.transactionReference || "-",
            ]),
            styles: { fontSize: 8.5, cellPadding: 1.5 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
            columnStyles: {
              0: { halign: "center", cellWidth: 10 },
              1: { halign: "left", cellWidth: 35 },
              2: { halign: "right", cellWidth: 35, fontStyle: "bold" },
              3: { halign: "center", cellWidth: 30 },
              4: { halign: "center", cellWidth: 30 },
              5: { halign: "left", cellWidth: 35 },
              6: { halign: "left" },
            },
            tableWidth: "wrap",
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didParseCell: (hookData: any) => {
              if (hookData.section === "body" && hookData.column.index === 2) {
                const type = loanPayments[hookData.row.index]?.paymentType;
                if (type === "interest" || type === "partial_interest") {
                  hookData.cell.styles.textColor = COLORS.green;
                } else if (type === "principal") {
                  hookData.cell.styles.textColor = COLORS.primary;
                } else {
                  hookData.cell.styles.textColor = COLORS.orange;
                }
              }
            },
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      // Monthly Breakdown
      for (let li = 0; li < reportData.loanDetails.length; li++) {
        const loan = reportData.loanDetails[li];
        const loanBreakdown = reportData.monthlyBreakdown.filter((m) => m.loanId === loan.loanId);
        if (loanBreakdown.length === 0) continue;

        y = checkPageBreak(doc, y, 30);
        y = addSectionTitle(
          doc,
          y,
          reportData.loanDetails.length > 1
            ? `Loan ${li + 1} - Monthly Breakdown (Principal: Rs. ${formatCurrency(loan.principalAmount)} @ ${loan.interestRate}% ${loan.interestRateType})`
            : "Monthly Interest Breakdown"
        );

        autoTable(doc, {
          startY: y,
          head: [
            ["Month", "Days", "Principal Balance", "Monthly Interest", "Cumulative Interest", "Interest Paid", "Principal Paid", "Cumulative Paid", "Pending Interest"],
          ],
          body: loanBreakdown.map((m) => [
            m.month,
            m.daysInMonth.toString(),
            formatCurrency(m.principalBalance),
            formatCurrency(m.monthlyInterest),
            formatCurrency(m.cumulativeInterest),
            formatCurrency(m.monthInterestPaid),
            formatCurrency(m.monthPrincipalPaid),
            formatCurrency(m.cumulativePaid),
            formatCurrency(m.pendingInterest),
          ]),
          styles: { fontSize: 8.5, cellPadding: 1.5, halign: "right" },
          headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "center" } },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
          didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.column.index === 8) {
              hookData.cell.styles.textColor = COLORS.red;
              hookData.cell.styles.fontStyle = "bold";
            }
            if (hookData.section === "body" && (hookData.column.index === 5 || hookData.column.index === 7)) {
              hookData.cell.styles.textColor = COLORS.green;
            }
            if (hookData.section === "body" && hookData.column.index === 6) {
              hookData.cell.styles.textColor = COLORS.primary;
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // Grand totals
      y = checkPageBreak(doc, y, 30);
      y = addSummaryBox(doc, y, [
        { label: "TOTAL INTEREST", value: `Rs. ${formatCurrency(reportData.totalInterestGenerated)}`, color: COLORS.primary },
        { label: "TOTAL PAID", value: `Rs. ${formatCurrency(reportData.totalInterestPaid)}`, color: COLORS.green },
        { label: "PENDING INTEREST", value: `Rs. ${formatCurrency(reportData.totalPendingInterest)}`, color: COLORS.red },
      ]);
    }
  }

  addFooter(doc);

  const fileName = `Interest_Report_${borrowerName}_${tillDate}.pdf`;
  doc.save(fileName.replace(/[,\s]+/g, "_"));
}