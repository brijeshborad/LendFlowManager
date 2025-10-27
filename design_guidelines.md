# Design Guidelines: Lending Management Application

## Design Approach

**Reference-Based Approach**: Modern Financial SaaS
Drawing inspiration from **Stripe Dashboard** (professional financial UI), **Linear** (clean typography and spacing), and **Mercury** (banking credibility), combined with **Material Design** principles for data-dense components and charts.

**Core Design Principles**:
- Professional credibility (handling financial data requires trust)
- Information clarity (complex loan data must be instantly scannable)
- Efficient workflows (minimize clicks for common actions)
- Real-time feedback (live updates feel responsive and modern)

---

## Typography System

**Font Families**:
- Primary: Inter (headings, UI elements, data) - via Google Fonts
- Monospace: JetBrains Mono (financial figures, amounts, transaction IDs)

**Type Scale**:
- Page Titles: text-3xl font-semibold (Dashboard, Borrowers, Reports)
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Labels/Captions: text-sm font-medium
- Financial Amounts: text-2xl font-bold tracking-tight (summary cards), text-lg font-semibold (loan details)
- Small Data: text-xs font-medium (table metadata, badges)

**Hierarchy Rules**:
- All monetary values use monospace font for alignment and professionalism
- Form labels are text-sm font-medium with slightly increased letter-spacing
- Status indicators use text-xs font-semibold uppercase

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** consistently
- Component padding: p-6 (cards), p-4 (smaller cards)
- Section spacing: space-y-8 (major sections), space-y-4 (related groups)
- Inline spacing: gap-4 (standard), gap-2 (tight groups)
- Page margins: p-8 (desktop), p-4 (mobile)

**Grid System**:
- Dashboard: 3-column grid on xl screens (lg:grid-cols-3), 2-column on md (md:grid-cols-2), single column mobile
- Borrower cards: 2-column grid (md:grid-cols-2), expandable to 3 on larger screens
- Summary cards: 4-column grid (xl:grid-cols-4 lg:grid-cols-2)

**Container Widths**:
- Main content: max-w-7xl mx-auto
- Forms/Modals: max-w-2xl
- Data tables: w-full with horizontal scroll on mobile

---

## Component Library

### Navigation & Shell

**Top Navigation Bar**:
- Fixed at top, height h-16, border-b
- Left: Logo/App name (text-xl font-bold)
- Center: Main navigation tabs (Dashboard, Borrowers, Loans, Reports, Settings)
- Right: Search icon, Notification bell with badge, User avatar dropdown
- Notification bell has absolute positioned red dot badge for unread count

**Sidebar** (Alternative layout option):
- Fixed left sidebar w-64, collapsible to w-16 on mobile
- Vertical navigation with icons + labels
- Pinned items at bottom (Settings, Help, Logout)

**Notification Panel**:
- Dropdown from bell icon, w-96, max-h-96 with scroll
- Each notification: p-4, border-b, hover background change
- Notification types indicated by icons (payment=check, alert=warning, reminder=clock)
- "Mark all as read" button at bottom

### Dashboard Components

**Summary Cards**:
- Grid layout, each card p-6, rounded-lg, border, shadow-sm
- Icon in top-left (h-10 w-10 rounded-full with icon)
- Label: text-sm font-medium
- Value: text-3xl font-bold tracking-tight (monospace for amounts)
- Sub-value: text-sm with trend indicator (↑/↓ arrow + percentage)
- Subtle pulse animation for real-time updates

**Chart Components**:
- Container: p-6, rounded-lg, border, min-h-80
- Header: flex justify-between with title (text-lg font-semibold) and time range selector
- Time range: Button group with segments (7D, 1M, 3M, 6M, 1Y, Custom)
- Charts using Recharts with consistent styling (smooth curves, minimal grid lines)
- Interactive tooltips on hover showing exact values
- Export button (download icon) in top-right

**Borrower List Cards**:
- Each borrower: p-4, rounded-lg, border, flex layout
- Left: Avatar (circular, 48px) or initials in colored circle
- Center: Name (text-lg font-semibold), contact info (text-sm), last payment date
- Right: Financial summary stacked (Outstanding, Pending Interest in monospace)
- Status badge: Small pill shaped, absolute top-right (Active/Overdue/Settled)
- Quick action buttons at bottom: Icon buttons for View, Add Payment, Send Reminder
- Hover effect: subtle shadow elevation

**Activity Feed**:
- Vertical timeline with connecting lines
- Each item: flex with icon, timestamp, description, amount
- Real-time items slide in from top with subtle animation

### Forms & Inputs

**Input Fields**:
- Height h-11, rounded-md, border, px-4
- Labels above: text-sm font-medium, mb-2
- Focus state: ring-2 offset
- Error state: border-red, text-red error message below
- Helper text: text-xs below field

**Dropdowns/Selects**:
- Styled consistently with inputs
- Custom arrow icon on right
- Dropdown menu: shadow-lg, rounded-md, max-h-60 with scroll

**Date Pickers**:
- Input with calendar icon on right
- Calendar popup: rounded-lg, shadow-xl, p-4
- Month/year navigation at top
- Selected date highlighted, today outlined

**File Upload**:
- Dashed border drag-drop area, p-8, rounded-lg
- Upload icon centered with "Drop files here or click to browse"
- Uploaded files shown below as chips with filename and remove (x) button

**Action Buttons**:
- Primary: px-6 py-2.5 rounded-md font-medium (for main actions like "Add Payment", "Save")
- Secondary: Same size, border variant
- Icon buttons: p-2 rounded-md (for quick actions)
- Destructive: Red variant for delete/remove actions

### Tables & Data Display

**Data Tables**:
- w-full, border rounded-lg, overflow-hidden
- Header: border-b, font-semibold, text-sm, p-4, sticky on scroll
- Rows: p-4, border-b, hover background
- Financial columns: Right-aligned, monospace font
- Action column: Right-aligned with icon buttons (Edit, Delete)
- Pagination: Centered below table with page numbers and prev/next

**Transaction History**:
- Each transaction row: flex justify-between, p-4, border-b
- Left: Date (text-sm) above description (text-base font-medium)
- Right: Amount (text-lg font-semibold monospace) above payment method badge
- Expandable accordion for transaction details (receipt, notes)

**Badges & Pills**:
- Rounded-full, px-3 py-1, text-xs font-semibold
- Status types: Active, Overdue, Settled, Pending
- Payment types: Principal, Interest, Mixed

### Modals & Overlays

**Modal Structure**:
- Fixed overlay with backdrop blur
- Modal: max-w-2xl, rounded-lg, shadow-2xl, p-0
- Header: p-6, border-b with title (text-xl font-semibold) and close (x) button
- Body: p-6, max-h-96 overflow-scroll
- Footer: p-6, border-t, flex justify-end with Cancel and Confirm buttons

**Toast Notifications**:
- Fixed bottom-right, stack vertically with gap-2
- Each toast: p-4, rounded-lg, shadow-lg, flex items-center, max-w-sm
- Icon on left, message, close button on right
- Slide-in animation, auto-dismiss after 5 seconds
- Types: Success (checkmark), Error (x), Warning (alert), Info (i)

**Confirmation Dialogs**:
- Smaller modal (max-w-md)
- Icon at top (warning triangle for destructive actions)
- Clear question/message
- Two buttons: Cancel (secondary) and Confirm (primary or destructive)

---

## Interaction Patterns

**Real-Time Updates**:
- Pulse animation on updated elements (subtle ring expanding)
- New items slide in with fade
- Updated values briefly highlight then fade to normal

**Loading States**:
- Skeleton screens for initial load (pulse animation)
- Spinner for inline actions (small circular spinner)
- Progress bars for file uploads

**Empty States**:
- Centered illustration/icon (h-24 w-24)
- Heading: text-lg font-semibold
- Description: text-sm
- Call-to-action button below

**Hover Effects**:
- Cards: subtle shadow elevation
- Buttons: slight brightness change
- Table rows: background tint
- No animated transitions (keep crisp)

---

## Data Visualization

**Chart Styling**:
- Grid lines: subtle, dotted
- Axes: clear labels, text-sm
- Data series: distinct colors with adequate contrast
- Tooltips: rounded-md, shadow-lg, p-2 with exact values
- Legend: horizontal below chart with clickable items to toggle series

**Graph Types**:
- Line charts: Smooth curves for trends (interest accrual, outstanding principal)
- Bar charts: Rounded corners for monthly comparisons
- Pie/Donut charts: Segments with labels, center displays total
- Area charts: Gradient fill for cash flow visualization

---

## Images

**Profile Pictures**: Circular avatars throughout (borrower list, user menu). Use placeholder initials in colored circles when no image uploaded.

**Illustrations**: Simple line-art illustrations for empty states (no borrowers, no payments yet) - use Hero Icons or similar icon library.

**Document Previews**: Thumbnail preview (128px) with file type icon overlay for uploaded agreements/receipts.

**No large hero images** - this is a data-focused application dashboard, not a marketing site.