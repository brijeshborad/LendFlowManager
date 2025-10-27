# LendingPro - Professional Lending Management System

## Project Overview
LendingPro is a comprehensive lending management web application built with React, Express, PostgreSQL, and WebSocket for real-time updates. It enables professional tracking of loans, borrowers, payments, automated email reminders, and analytics dashboards.

## Last Updated
October 27, 2024

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** (React Query v5) for data fetching
- **Shadcn/UI** component library with Tailwind CSS
- **Recharts** for analytics visualizations
- **WebSocket client** for real-time notifications
- **Lucide React** for icons

### Backend
- **Express.js** server with TypeScript
- **PostgreSQL** database (Neon-backed)
- **Drizzle ORM** for database operations
- **Replit Auth** (OpenID Connect) for authentication
- **WebSocket Server** (ws package) for real-time communication
- **Multer** for file uploads
- **Passport.js** for session management

### Key Features Implemented

#### 1. Authentication & User Management
- Replit Auth integration with Google, GitHub, email/password login
- Secure session management with PostgreSQL session store
- User profiles with notification preferences
- Auto-logout configuration
- Landing page for unauthenticated users

#### 2. Database Schema
Complete Drizzle schema with following tables:
- **users**: User profiles and preferences
- **borrowers**: Borrower information with contact details
- **loans**: Loan records with principal, interest rates, terms
- **payments**: Payment tracking with types (principal/interest/mixed)
- **reminders**: Scheduled email reminders
- **email_logs**: Email activity tracking
- **email_templates**: Customizable email templates
- **audit_logs**: Security audit trail
- **sessions**: Session storage for auth

#### 3. API Routes
All protected with authentication middleware:
- `/api/auth/*` - User authentication and preferences
- `/api/borrowers/*` - CRUD operations for borrowers
- `/api/loans/*` - CRUD operations for loans  
- `/api/payments/*` - CRUD operations for payments
- `/api/reminders/*` - Reminder management
- `/api/email-templates/*` - Email template management
- `/api/email-logs` - Email activity logs
- `/api/audit-logs` - Security audit trail
- `/api/dashboard/stats` - Dashboard analytics

#### 4. Real-Time Features
- **WebSocket Server** on `/ws` path
- Live dashboard updates
- Real-time notifications for:
  - Payment received
  - Borrower/loan changes
  - High pending interest alerts
  - Email delivery status
- Automatic broadcast to all user's connected devices

#### 5. Frontend Components
Reusable components with full interactivity:
- `DashboardHeader` - Navigation with search and notifications
- `AppSidebar` - Main navigation sidebar
- `SummaryCard` - Dashboard statistics cards
- `BorrowerCard` - Borrower information cards with quick actions
- `InterestChart` - Interactive charts with Recharts
- `ActivityFeed` - Real-time activity timeline
- `AddPaymentModal` - Payment recording form
- `AddBorrowerModal` - Borrower creation form
- `NotificationPanel` - Real-time notification dropdown
- `Landing` - Marketing landing page

#### 6. Planned Features (Not Yet Implemented)
- Email service integration (SendGrid/Resend)
- Automated email reminder scheduling
- Interest calculation engine (simple/compound)
- File upload to object storage
- PDF/Excel export functionality
- Borrower statements generation
- Advanced analytics and reporting
- SMS/WhatsApp notifications (future phase)
- Two-factor authentication (future phase)

## Development Setup

### Environment Variables
Required environment variables (automatically provided by Replit):
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `REPL_ID` - Replit project ID
- `REPLIT_DOMAINS` - Allowed domains for OAuth callbacks
- `ISSUER_URL` - OIDC issuer URL (defaults to replit.com/oidc)

Object Storage (if using):
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`

### Running the Application
```bash
npm run dev
```

This starts:
- Express server on port 5000
- Vite dev server (served through Express)
- WebSocket server on `/ws` path

### Database Management
```bash
# Push schema changes to database
npm run db:push

# Force push (if conflicts)
npm run db:push --force
```

## Project Structure

```
├── client/
│   └── src/
│       ├── components/        # Reusable React components
│       │   ├── ui/           # Shadcn UI components
│       │   └── examples/     # Component examples (design phase)
│       ├── hooks/            # Custom React hooks (useAuth)
│       ├── lib/              # Utilities (queryClient, authUtils)
│       ├── pages/            # Route pages (Dashboard, Landing)
│       └── App.tsx           # Main app with auth routing
├── server/
│   ├── routes.ts             # API routes + WebSocket setup
│   ├── storage.ts            # Database operations (IStorage interface)
│   ├── replitAuth.ts         # Authentication setup
│   ├── db.ts                 # Database connection
│   └── index.ts              # Server entry point
├── shared/
│   └── schema.ts             # Drizzle database schema + Zod schemas
└── design_guidelines.md      # UI/UX design specifications
```

## API Documentation

### Authentication
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user
- `GET /api/callback` - OAuth callback
- `GET /api/auth/user` - Get current user
- `PATCH /api/auth/user/preferences` - Update user preferences

### Borrowers
- `GET /api/borrowers` - List all borrowers
- `GET /api/borrowers/:id` - Get single borrower
- `POST /api/borrowers` - Create borrower
- `PATCH /api/borrowers/:id` - Update borrower
- `DELETE /api/borrowers/:id` - Delete borrower

### Loans
- `GET /api/loans?borrowerId={id}` - List loans (optionally filtered)
- `GET /api/loans/:id` - Get single loan
- `POST /api/loans` - Create loan
- `PATCH /api/loans/:id` - Update loan
- `DELETE /api/loans/:id` - Delete loan

### Payments
- `GET /api/payments?loanId={id}` - List payments (optionally filtered)
- `POST /api/payments` - Record payment
- `PATCH /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### WebSocket Messages
Client → Server:
```json
{
  "type": "auth",
  "userId": "user_id_here"
}
```

Server → Client:
```json
{
  "type": "payment_created",
  "data": { /* payment object */ },
  "notification": {
    "title": "Payment Recorded",
    "message": "Payment of ₹50,000 received",
    "type": "payment"
  }
}
```

## Design System

### Colors
- **Primary**: Blue (#3B82F6) - Trust and professionalism
- **Success**: Green - Positive actions, received payments
- **Warning**: Orange - Overdue, pending interest
- **Danger**: Red - Alerts, high priority
- **Chart Colors**: Defined in Tailwind config for consistency

### Typography
- **Font Family**: Inter (UI), JetBrains Mono (financial figures)
- **Scale**: text-xs to text-5xl following Tailwind defaults
- **Financial Amounts**: Always use monospace font

### Components
- Follow Shadcn/UI patterns
- Use `hover-elevate` and `active-elevate-2` utilities for interactions
- All interactive elements have `data-testid` attributes
- Cards use subtle elevation (no heavy shadows)

## Security Considerations

- All API routes protected with `isAuthenticated` middleware
- Session-based authentication with secure cookies
- SQL injection protection via Drizzle ORM
- Data isolation (users only see their own data)
- Audit logs for all critical actions
- Password/tokens never logged or exposed
- CSRF protection via SameSite cookies

## Performance Optimizations

- TanStack Query for caching and background refetching
- WebSocket for real-time updates (avoids polling)
- Parallel database queries where possible
- Indexed database columns for fast lookups
- React Query invalidation on mutations

## Known Issues / TODOs

1. **Email Integration**: Need to set up SendGrid or Resend connector
2. **File Uploads**: Need to integrate object storage for receipts/documents
3. **Interest Calculation**: Engine not yet implemented (returns 0)
4. **Reminder Scheduling**: Cron jobs/scheduler not set up
5. **PDF Generation**: Statement export not implemented
6. **Testing**: E2E tests need to be written
7. **Production Deployment**: Need to test publishing workflow

## User Preferences

None specified yet - this is a template project ready for customization.

## Recent Changes

### October 27, 2024
- Created complete database schema with Drizzle ORM
- Implemented Replit Auth integration
- Built all API routes with authentication
- Set up WebSocket server for real-time updates
- Created landing page and authenticated dashboard
- Designed and implemented all UI components
- Configured proper routing with authentication checks
- Added comprehensive audit logging

## Next Steps

1. Integrate email service (SendGrid/Resend)
2. Implement interest calculation engine
3. Set up automated reminder scheduling
4. Add file upload functionality
5. Build reporting and export features
6. Write end-to-end tests
7. Deploy to production

## Notes

- Mock data is marked with `//todo: remove mock functionality` comments
- All financial amounts stored as DECIMAL(15,2) in database
- WebSocket path is `/ws` (separate from Vite HMR WebSocket)
- Design follows professional SaaS financial application patterns
- **Email Service**: User opted not to use Replit's Resend integration. Using custom email service layer that supports both SendGrid and Resend via environment variables. Set `EMAIL_PROVIDER`, `EMAIL_API_KEY`, and `EMAIL_FROM_ADDRESS` to enable email functionality. Currently running in mock mode.
