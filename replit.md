# LendingPro - Professional Lending Management System

## Overview
LendingPro is a comprehensive web application designed for professional lending management. It provides tools for tracking loans, borrowers, and payments, offering automated email reminders, analytical dashboards, and comprehensive financial reports. The system aims to streamline lending operations, enhance financial oversight, and improve communication with borrowers. Its core capabilities include secure user authentication, real-time updates, automated interest calculation and reminder systems, and multi-dimensional reporting with data visualization.

## User Preferences
None specified yet - this is a template project ready for customization.

## System Architecture
LendingPro is a full-stack web application.

**Frontend:**
-   **Framework:** React with TypeScript.
-   **Routing:** Wouter.
-   **Data Fetching:** TanStack Query (React Query v5).
-   **UI Library:** Shadcn/UI with Tailwind CSS for a modern, professional look.
-   **Data Visualization:** Recharts for interactive analytics and financial reports (line charts for interest trends, bar charts for borrower comparisons).
-   **Real-time:** WebSocket client for notifications and live updates.
-   **Icons:** Lucide React.
-   **Design System:**
    -   **Colors:** Primary Blue (#3B82F6), Green for success, Orange for warning, Red for danger. Chart colors are Tailwind-defined.
    -   **Typography:** Inter for UI, JetBrains Mono for financial figures.
    -   **Components:** Follows Shadcn/UI patterns, uses `hover-elevate` and `active-elevate-2` utilities, with `data-testid` attributes for interactive elements. Cards use subtle elevation.

**Key Features:**
-   **Comprehensive Reports:** Four professional report types with data visualization:
    -   Loan Summary: Complete loan overview with balances, interest, and payment status
    -   Payment History: Chronological record of all payments received
    -   Interest Earned: Monthly breakdown with trend visualization
    -   Borrower Summary: Financial overview by borrower with comparative charts
-   All monetary values displayed in monospace font for professional alignment
-   Proper error handling with descriptive messages
-   Real-time data aggregation and calculations

**Backend:**
-   **Framework:** Express.js with TypeScript.
-   **Database:** PostgreSQL (Neon-backed) managed with Drizzle ORM.
-   **Authentication:** Replit Auth (OpenID Connect) for secure login (Google, GitHub, email/password). Secure session management via PostgreSQL session store.
-   **Real-time:** WebSocket Server (`ws` package).
-   **File Uploads:** Multer.
-   **Session Management:** Passport.js.
-   **Automated Processes:**
    -   **Interest Calculation System:** Automatically calculates monthly interest based on loan start date, supporting monthly/annual rates. Tracks historical interest in `interest_entries` table. Generates historical entries for loans with past start dates, handling month-end complexities (e.g., February for Jan 31st loans).
    -   **Email Reminder Scheduler:** Automated monthly scheduler (1st of month) to generate interest entries, and send HTML email summaries to lenders with active loans.
-   **API Routes:**
    -   **Authentication:** `/api/auth/*`
    -   **CRUD Operations:** `/api/borrowers/*`, `/api/loans/*`, `/api/payments/*`, `/api/reminders/*`, `/api/email-templates/*`.
    -   **Data Retrieval:** `/api/interest-entries/*`, `/api/email-logs`, `/api/audit-logs`, `/api/dashboard/stats`.
    -   **Reports:** `/api/reports/loan-summary`, `/api/reports/payment-history`, `/api/reports/interest-earned`, `/api/reports/borrower-summary`.
    -   **Admin Triggers:** `/api/admin/generate-interest`, `/api/admin/send-reminders`, `/api/admin/scheduler-status`.
-   **Database Schema (Drizzle ORM):** Includes `users`, `borrowers`, `loans`, `payments`, `reminders`, `interest_entries`, `email_logs`, `email_templates`, `audit_logs`, and `sessions` tables.
-   **Security:** All API routes protected with `isAuthenticated` middleware, session-based authentication, SQL injection protection via Drizzle ORM, data isolation, audit logs, and CSRF protection.
-   **Performance:** TanStack Query for caching, WebSockets for real-time, indexed database columns, and parallel queries.
-   **Project Structure:** Organized into `client/` (React app), `server/` (Express app), and `shared/` (Drizzle schema, Zod schemas) directories.

## External Dependencies
-   **PostgreSQL:** Primary database (Neon-backed).
-   **Replit Auth:** For user authentication (OpenID Connect).
-   **SendGrid/Resend:** Supported email providers for real email sending (requires environment variables `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`). Currently runs in mock mode for development.
-   **WebSocket:** For real-time communication between server and client.