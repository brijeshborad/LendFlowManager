import { db } from './db';
import { loans, interestEntries, borrowers, payments } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

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
 * Calculate interest considering principal payments that reduce outstanding balance
 */
export async function calculateInterestWithPrincipalPayments(
  loanId: string,
  principalAmount: number,
  interestRate: number,
  interestRateType: 'monthly' | 'annual',
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  // Get all principal payments for this loan
  const principalPayments = await db
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

  let totalInterest = 0;
  let currentPrincipal = principalAmount;
  let currentDate = new Date(startDate);
  
  // Calculate month by month
  while (currentDate < endDate) {
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthEndDate = monthEnd < endDate ? monthEnd : endDate;
    
    // Get payments in this month
    const monthPayments = principalPayments
      .map(p => ({
        date: new Date(p.paymentDate),
        amount: parseFloat(p.amount.toString())
      }))
      .filter(p => p.date >= currentDate && p.date <= monthEndDate);
    
    let monthInterest = 0;
    
    if (monthPayments.length === 0) {
      // No payments this month
      if (currentDate.getTime() === new Date(startDate).getTime()) {
        // First month - calculate from start date
        const daysFromStart = 30 - new Date(startDate).getDate() + 1;
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysFromStart / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysFromStart / 30);
      } else if (monthEndDate.getTime() === endDate.getTime() && endDate.getDate() !== 30) {
        // Last partial month
        const daysInPartialMonth = endDate.getDate();
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysInPartialMonth / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysInPartialMonth / 30);
      } else {
        // Complete month
        monthInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100)
          : currentPrincipal * (interestRate / 100 / 12);
      }
    } else {
      // Has payments - split calculation
      for (const payment of monthPayments) {
        const daysBefore = payment.date.getDate();
        const periodInterest = interestRateType === 'monthly'
          ? currentPrincipal * (interestRate / 100) * (daysBefore / 30)
          : currentPrincipal * (interestRate / 100 / 12) * (daysBefore / 30);
        monthInterest += periodInterest;
        
        currentPrincipal = Math.max(0, currentPrincipal - payment.amount);
      }
      
      // Days after last payment
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
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1);
  }
  
  return totalInterest;
}

/**
 * Calculate total interest for all active loans in real-time
 */
export async function calculateRealTimeInterestForUser(userId: string) {
  try {
    const activeLoans = await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.status, 'active')));

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    const loanInterests = [];
    
    for (const loan of activeLoans) {
      const principal = parseFloat(loan.principalAmount);
      const rate = parseFloat(loan.interestRate);
      
      // Use new calculation method that considers principal payments
      const totalInterest = await calculateInterestWithPrincipalPayments(
        loan.id,
        principal,
        rate,
        loan.interestRateType as 'monthly' | 'annual',
        new Date(loan.startDate),
        today
      );
      
      loanInterests.push({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        totalInterest,
        startDate: loan.startDate
      });
    }

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

    // Generate an interest entry for each month from start to now
    for (let i = 0; i <= monthsDiff; i++) {
      // Use safe month addition to avoid skipping months for 29th-31st dates
      const periodStart = addMonthsSafe(loanStartDate, i);
      const periodEnd = addMonthsSafe(loanStartDate, i + 1);
      
      // Check if entry already exists for this period
      const existingEntry = await db
        .select()
        .from(interestEntries)
        .where(
          and(
            eq(interestEntries.loanId, loanId),
            eq(interestEntries.periodStart, periodStart)
          )
        )
        .limit(1);

      // Skip if entry already exists
      if (existingEntry.length > 0) {
        console.log(`⏭️  Entry already exists for period ${periodStart.toISOString().split('T')[0]}`);
        continue;
      }

      const principal = parseFloat(principalAmount);
      const rate = parseFloat(interestRate);
      const interestAmount = calculateMonthlyInterest(principal, rate, interestRateType);

      // Create the interest entry
      const entry = await db.insert(interestEntries).values({
        loanId,
        userId,
        borrowerId,
        periodStart,
        periodEnd,
        principalAmount,
        interestRate,
        interestAmount: interestAmount.toFixed(2),
        isAutoGenerated: true,
        notes: `Auto-generated ${interestRateType} interest for period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
      }).returning();

      entries.push(entry[0]);
      console.log(`✅ Created interest entry: ${periodStart.toISOString().split('T')[0]} - ₹${interestAmount.toFixed(2)}`);
    }

    console.log(`🎉 Successfully created ${entries.length} historical interest entries`);
    return { created: entries.length, entries };
  } catch (error) {
    console.error('Error generating historical interest entries:', error);
    throw error;
  }
}
