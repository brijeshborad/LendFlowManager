# LendingPro - Professional Lending Management System

## Overview
LendingPro is a comprehensive web application designed for professional lending management. It provides tools for tracking loans, borrowers, and payments, offering automated email reminders, analytical dashboards, and comprehensive financial reports. The system aims to streamline lending operations, enhance financial oversight, and improve communication with borrowers. Its core capabilities include secure user authentication, real-time updates, automated interest calculation and reminder systems, and multi-dimensional reporting with data visualization.

## Recent Changes

### UI Improvements - Dark Mode & Header Redesign (October 27, 2025)
- **Dark Mode Support:** Implemented comprehensive dark mode with ThemeProvider
  - SSR-safe implementation with proper window guards for non-browser environments
  - Theme toggle button with localStorage persistence
  - All components use semantic color tokens that auto-adapt to theme
  - Smooth transitions between light and dark modes
- **Header Redesign:** Complete overhaul with modern, professional aesthetic
  - Gradient logo badge with glassmorphism backdrop blur effect
  - Professional subtitle "Professional Lending Management"
  - Improved spacing and layout with better visual hierarchy
  - Integrated theme toggle in header
- **Functional Notifications:** Real notification system with popover UI
  - New API endpoint `/api/notifications` (currently returns mock data)
  - Notification bell with unread count badge
  - Popover showing notification list with icons and relative timestamps
  - Three notification types: payment, interest, reminder
- **Improved Logout Flow:** Fixed to properly clear session and redirect
  - Uses correct GET `/api/logout` endpoint
  - Clears React Query cache before redirect
  - Proper session cleanup via Replit Auth

### Dashboard Enhancements (October 27, 2025)
- **Interactive Borrower Cards:** Added working buttons for View Details, Add Payment, and Send Reminder on all borrower cards
- **Enhanced Payment Modal:** Updated Quick Payment feature to include borrower and loan selection dropdowns with proper validation
- **New Visualizations:** 
  - Loan Status Distribution pie chart showing breakdown of active/settled/overdue loans
  - Monthly Interest Earned area chart displaying interest trends over the last 6 months
- **Additional Metrics:** Added three new metric cards displaying:
  - Average Loan Size across all loans
  - Average Interest Rate per month
  - Total Interest Earned from all interest entries
- **Professional Styling:** All monetary values use monospace font (JetBrains Mono) for perfect alignment per design guidelines
- **Comprehensive Reports:** Four professional report types with data visualization on Reports page

## User Preferences
None specified yet - this is a template project ready for customization.

## System Architecture
LendingPro is a full-stack web application.

**Frontend:**
-   **Framework:** React with TypeScript.
-   **Routing:** Wouter.
-   **Data Fetching:** TanStack Query (React Query v5).
-   **UI Library:** Shadcn/UI with Tailwind CSS for a modern, professional look.
-   **Theme System:** Dark mode support with ThemeProvider, SSR-safe localStorage persistence, seamless light/dark switching.
-   **Data Visualization:** Recharts for interactive analytics and financial reports (line charts for interest trends, bar charts for borrower comparisons).
-   **Real-time:** WebSocket client for notifications and live updates.
-   **Icons:** Lucide React.
-   **Design System:**
    -   **Colors:** Primary Blue (#3B82F6), Green for success, Orange for warning, Red for danger. Chart colors are Tailwind-defined. All colors adapt to dark mode via semantic tokens.
    -   **Typography:** Inter for UI, JetBrains Mono for financial figures.
    -   **Components:** Follows Shadcn/UI patterns, uses `hover-elevate` and `active-elevate-2` utilities, with `data-testid` attributes for interactive elements. Cards use subtle elevation.
    -   **Header:** Modern glassmorphism design with gradient logo, backdrop blur, and integrated controls.

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
    -   **Authentication:** `/api/auth/*`, `/api/logout` (GET - Replit Auth logout)
    -   **CRUD Operations:** `/api/borrowers/*`, `/api/loans/*`, `/api/payments/*`, `/api/reminders/*`, `/api/email-templates/*`.
    -   **Data Retrieval:** `/api/interest-entries/*`, `/api/email-logs`, `/api/audit-logs`, `/api/dashboard/stats`, `/api/notifications` (mock data).
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