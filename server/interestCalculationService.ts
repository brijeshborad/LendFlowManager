import { db } from './db';
import { loans, interestEntries, borrowers, payments } from '@shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export interface InterestCalculation {
  loanId: string;
  borrowerId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  principalAmount: string;
  interestRate: string;
  interestRateType: string;
  interestAmount: string;
}

/**
 * Safely add months to a date, handling end-of-month edge cases
 * For example: Jan 31 + 1 month = Feb 28/29 (not Mar 3)
 */
function addMonthsSafe(date: Date, monthsToAdd: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  
  // Add the months
  result.setMonth(result.getMonth() + monthsToAdd);
  
  // If the day changed (overflow), set to last day of target month
  if (result.getDate() !== originalDay) {
    // Go to the 0th day of next month (which is last day of current month)
    result.setDate(0);
  }
  
  return result;
}

/**
 * Calculate real-time interest for a loan based on 30-day months
 */
function calculateRealTimeInterest(
  principalAmount: number,
  interestRate: number,
  interestRateType: 'monthly' | 'annual',
  startDate: Date,
  endDate: Date = new Date()
): number {
  // Calculate days treating all months as exactly 30 days
  let adjustedDays = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthEnd = endOfMonth < endDate ? endOfMonth : endDate;
    const daysToCount = Math.ceil((monthEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Always count exactly 30 days per month (treat all months as 30 days)
    adjustedDays += Math.min(daysToCount, 30);
    
    // If we've completed a full month, always add 30 days regardless of actual month length
    if (monthEnd === endOfMonth && currentDate.getDate() === 1) {
      adjustedDays = adjustedDays - daysToCount + 30;
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }
  
  const exactMonths = adjustedDays / 30;
  
  if (interestRateType === 'monthly') {
    return principalAmount * (interestRate / 100) * exactMonths;
  } else {
    return principalAmount * (interestRate / 100 / 12) * exactMonths;
  }
}

/**
 * Calculate interest considering principal payments that reduce outstanding balance.
 * Accepts pre-loaded payments to avoid N+1 queries when called in a loop.
 */
export function calculateInterestFromPayments(
  principalPaymentsList: { paymentDate: Date; amount: string }[],
  principalAmount: number,
  interestRate: number,
  interestRateType: 'monthly' | 'annual',
  startDate: Date,
  endDate: Date = new Date()
): number {
  let totalInterest = 0;
  let currentPrincipal = principalAmount;
  let currentDate = new Date(startDate);

  // Calculate month by month
  while (currentDate < endDate) {
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthEndDate = monthEnd < endDate ? monthEnd : endDate;

    // Get payments in this month
    const monthPayments = principalPaymentsList
      .map(p => ({
        date: new Date(p.paymentDate),
        amount: parseFloat(p.amount.toString())
      }))
      .filter(p => p.date >= currentDate && p.date <= monthEndDate);

    let monthInterest = 0;

    if (monthPayments.length === 0) {
      if (currentDate.getTime() === new Date(startDate).getTime()) {
        const daysFromStart = 30 - new Date(startDate).getDate() + 1;
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysFromStart / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysFromStart / 30);
      } else if (monthEndDate.getTime() === endDate.getTime() && endDate.getDate() !== 30) {
        const daysInPartialMonth = endDate.getDate();
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysInPartialMonth / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysInPartialMonth / 30);
      } else {
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100)
          : currentPrincipal * (interestRate / 100 / 12);
      }
    } else {
      for (const payment of monthPayments) {
        const daysBefore = payment.date.getDate();
        const periodInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysBefore / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysBefore / 30);
        monthInterest += periodInterest;

        currentPrincipal = Math.max(0, currentPrincipal - payment.amount);
      }

      const lastPayment = monthPayments[monthPayments.length - 1];
      const daysAfter = 30 - lastPayment.date.getDate();
      if (daysAfter > 0) {
        const periodInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysAfter / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysAfter / 30);
        monthInterest += periodInterest;
      }
    }

    totalInterest += monthInterest;

    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }

  return totalInterest;
}

/**
 * Backward-compatible async wrapper that fetches payments from DB.
 * Use calculateInterestFromPayments directly when you already have payment data.
 */
export async function calculateInterestWithPrincipalPayments(
  loanId: string,
  principalAmount: number,
  interestRate: number,
  interestRateType: 'monthly' | 'annual',
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  const principalPaymentsList = await db
    .select({
      paymentDate: payments.paymentDate,
      amount: payments.amount
    })
    .from(payments)
    .where(and(
      eq(payments.loanId, loanId),
      eq(payments.paymentType, 'principal')
    ))
    .orderBy(payments.paymentDate);

  return calculateInterestFromPayments(
    principalPaymentsList, principalAmount, interestRate, interestRateType, startDate, endDate
  );
}

/**
   * Calculate total interest for loans in real-time.
 * Default: active loans only (legacy behavior).
 * Pass { includeAllLoans: true } to also include settled/closed loans;
 * for those, accrual stops at `closedAt` (or `today` if not set).
 */
export async function calculateRealTimeInterestForUser(
  userId: string,
  options: { includeAllLoans?: boolean } = {}
) {
  try {
    const baseFilter = options.includeAllLoans
      ? eq(loans.userId, userId)
      : and(eq(loans.userId, userId), eq(loans.status, 'active'));

    const targetLoans = await db
      .select()
      .from(loans)
      .where(baseFilter);

    if (targetLoans.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loanIds = targetLoans.map(l => l.id);
    const allPrincipalPayments = await db
      .select({
        loanId: payments.loanId,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
      })
      .from(payments)
      .where(and(
        inArray(payments.loanId, loanIds),
        eq(payments.paymentType, 'principal')
      ))
      .orderBy(payments.paymentDate);

    const paymentsByLoan = new Map<string, { paymentDate: Date; amount: string }[]>();
    for (const p of allPrincipalPayments) {
      if (!paymentsByLoan.has(p.loanId)) {
        paymentsByLoan.set(p.loanId, []);
      }
      paymentsByLoan.get(p.loanId)!.push({ paymentDate: p.paymentDate, amount: p.amount });
    }

    const loanInterests = targetLoans.map(loan => {
      const principal = parseFloat(loan.principalAmount);
      const rate = parseFloat(loan.interestRate);
      const loanPayments = paymentsByLoan.get(loan.id) || [];

      // Closed/settled loans stop accruing interest at closedAt (or today if missing)
      const accrualEnd = loan.status !== 'active' && loan.closedAt
        ? new Date(loan.closedAt)
        : today;

      const totalInterest = calculateInterestFromPayments(
        loanPayments,
        principal,
        rate,
        loan.interestRateType as 'monthly' | 'annual',
        new Date(loan.startDate),
        accrualEnd
      );

      return {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        totalInterest,
        startDate: loan.startDate,
      };
    });

    return loanInterests;
  } catch (error) {
    console.error('Error calculating real-time interest:', error);
    throw error;
  }
}

/**
 * Create interest entries for all loans that need them
 */
export async function generateMonthlyInterestEntries(
  targetMonth?: Date
): Promise<{ created: number; calculations: InterestCalculation[] }> {
  const month = targetMonth || new Date();
  
  try {
    const calculations = await getLoansNeedingInterestCalculation(month);
    
    if (calculations.length === 0) {
      console.log('No interest entries needed for', month.toISOString());
      return { created: 0, calculations: [] };
    }

    // Insert all interest entries
    for (const calc of calculations) {
      await db.insert(interestEntries).values({
        loanId: calc.loanId,
        userId: calc.userId,
        borrowerId: calc.borrowerId,
        periodStart: calc.periodStart,
        periodEnd: calc.periodEnd,
        principalAmount: calc.principalAmount,
        interestRate: calc.interestRate,
        interestAmount: calc.interestAmount,
        isAutoGenerated: true,
        notes: `Auto-generated interest for period ${calc.periodStart.toISOString().split('T')[0]} to ${calc.periodEnd.toISOString().split('T')[0]}`,
      });
    }

    console.log(`✅ Created ${calculations.length} interest entries for ${month.toISOString().split('T')[0]}`);
    return { created: calculations.length, calculations };
  } catch (error) {
    console.error('Error generating monthly interest entries:', error);
    throw error;
  }
}

/**
 * Get interest history for a specific loan
 */
export async function getInterestHistory(loanId: string) {
  try {
    const entries = await db
      .select()
      .from(interestEntries)
      .where(eq(interestEntries.loanId, loanId))
      .orderBy(sql`${interestEntries.periodStart} DESC`);

    return entries;
  } catch (error) {
    console.error('Error fetching interest history:', error);
    throw error;
  }
}

/**
 * Get all interest entries for a user
 */
export async function getUserInterestEntries(userId: string) {
  try {
    const entries = await db
      .select({
        id: interestEntries.id,
        loanId: interestEntries.loanId,
        borrowerId: interestEntries.borrowerId,
        borrowerName: borrowers.name,
        periodStart: interestEntries.periodStart,
        periodEnd: interestEntries.periodEnd,
        principalAmount: interestEntries.principalAmount,
        interestRate: interestEntries.interestRate,
        interestAmount: interestEntries.interestAmount,
        isAutoGenerated: interestEntries.isAutoGenerated,
        notes: interestEntries.notes,
        createdAt: interestEntries.createdAt,
      })
      .from(interestEntries)
      .leftJoin(borrowers, eq(interestEntries.borrowerId, borrowers.id))
      .where(eq(interestEntries.userId, userId))
      .orderBy(sql`${interestEntries.periodStart} DESC`);

    return entries;
  } catch (error) {
    console.error('Error fetching user interest entries:', error);
    throw error;
  }
}

/**
 * Calculate total outstanding interest for a loan
 */
export async function calculateOutstandingInterest(loanId: string): Promise<number> {
  try {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${interestEntries.interestAmount} AS NUMERIC)), 0)`,
      })
      .from(interestEntries)
      .where(eq(interestEntries.loanId, loanId));

    return result[0]?.total || 0;
  } catch (error) {
    console.error('Error calculating outstanding interest:', error);
    return 0;
  }
}

/**
 * Generate all historical interest entries for a loan from its start date to now
 * This is called when a loan is created with a historical start date
 */
export async function generateHistoricalInterestEntries(
  loanId: string,
  userId: string,
  borrowerId: string,
  startDate: Date,
  principalAmount: string,
  interestRate: string,
  interestRateType: 'monthly' | 'annual'
): Promise<{ created: number; entries: any[] }> {
  try {
    const now = new Date();
    const loanStartDate = new Date(startDate);
    const entries = [];
    
    // Calculate number of months between start date and now
    const monthsDiff = 
      (now.getFullYear() - loanStartDate.getFullYear()) * 12 +
      (now.getMonth() - loanStartDate.getMonth());

    console.log(`📊 Generating historical interest entries for loan ${loanId}: ${monthsDiff + 1} months`);

    // Build all period starts we want to create
    const allPeriods: { periodStart: Date; periodEnd: Date }[] = [];
    for (let i = 0; i <= monthsDiff; i++) {
      allPeriods.push({
        periodStart: addMonthsSafe(loanStartDate, i),
        periodEnd: addMonthsSafe(loanStartDate, i + 1),
      });
    }

    // Batch check: fetch all existing entries for this loan in ONE query
    const existingEntries = await db
      .select({ periodStart: interestEntries.periodStart })
      .from(interestEntries)
      .where(eq(interestEntries.loanId, loanId));

    const existingDates = new Set(
      existingEntries.map(e => e.periodStart.toISOString())
    );

    // Filter to only new periods
    const newPeriods = allPeriods.filter(
      p => !existingDates.has(p.periodStart.toISOString())
    );

    if (newPeriods.length === 0) {
      console.log(`⏭️  All entries already exist for loan ${loanId}`);
    } else {
      const principal = parseFloat(principalAmount);
      const rate = parseFloat(interestRate);
      const interestAmount = calculateMonthlyInterest(principal, rate, interestRateType);

      // Batch insert all new entries in ONE query
      const valuesToInsert = newPeriods.map(p => ({
        loanId,
        userId,
        borrowerId,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        principalAmount,
        interestRate,
        interestAmount: interestAmount.toFixed(2),
        isAutoGenerated: true,
        notes: `Auto-generated ${interestRateType} interest for period ${p.periodStart.toISOString().split('T')[0]} to ${p.periodEnd.toISOString().split('T')[0]}`,
      }));

      const inserted = await db.insert(interestEntries).values(valuesToInsert).returning();
      entries.push(...inserted);
      console.log(`✅ Batch-created ${inserted.length} interest entries for loan ${loanId}`);
    }

    console.log(`🎉 Successfully created ${entries.length} historical interest entries`);
    return { created: entries.length, entries };
  } catch (error) {
    console.error('Error generating historical interest entries:', error);
    throw error;
  }
}
