# CRM Application — Design Document

**Version:** 1.0  
**Date:** 2026-06-11  
**Author:** Architect  
**Status:** Draft — for UI/UX Design (stitch.ai)

---

## 1. Application Overview

A single-page web application (SPA) for CRM, designed for desktop browsers only. Users interact with five core modules — Dashboard, Contacts, Deals (Kanban), Activities, and Tasks — through a persistent left sidebar. The visual language is clean, data-dense, and professional; inspired by modern tools like Linear and HubSpot.

**Target resolution:** minimum supported width 1280 px, optimised for 1440 px and above. Mobile and tablet layouts are out of scope for this version.

---

## 2. Design Principles

1. **Clarity over decoration** — data is the content; UI chrome is minimal
2. **Consistent spatial rhythm** — 8 px base grid throughout
3. **Progressive disclosure** — show summaries in lists, full detail on click
4. **Actionable empty states** — every empty view includes a clear CTA
5. **Feedback on every action** — toasts for success, inline errors for validation, skeletons for loading

---

## 3. Design Tokens

### 3.1 Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#4F46E5` | Primary buttons, active nav, links |
| `--color-primary-light` | `#EEF2FF` | Hover states, active backgrounds |
| `--color-primary-dark` | `#3730A3` | Pressed states |
| `--color-success` | `#10B981` | Closed Won badge, completed tasks |
| `--color-danger` | `#EF4444` | Closed Lost badge, delete actions, errors |
| `--color-warning` | `#F59E0B` | Overdue tasks, low-priority alerts |
| `--color-info` | `#3B82F6` | Informational toasts, tooltips |
| `--color-surface` | `#FFFFFF` | Card and modal backgrounds |
| `--color-background` | `#F8FAFC` | Page background |
| `--color-border` | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | `#1E293B` | Headings, labels |
| `--color-text-secondary` | `#64748B` | Secondary text, timestamps |
| `--color-text-disabled` | `#CBD5E1` | Disabled inputs, placeholder |
| `--color-sidebar-bg` | `#1E1B4B` | Sidebar background (dark) |
| `--color-sidebar-text` | `#C7D2FE` | Sidebar nav item text |
| `--color-sidebar-active` | `#4F46E5` | Active sidebar item highlight |

### 3.2 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family` | `Inter, system-ui, sans-serif` | All text |
| `--font-size-xs` | `11px` | Timestamps, badges |
| `--font-size-sm` | `13px` | Table cells, secondary labels |
| `--font-size-base` | `14px` | Body text, form inputs |
| `--font-size-md` | `16px` | Card titles, section headings |
| `--font-size-lg` | `20px` | Page titles |
| `--font-size-xl` | `24px` | Dashboard metric numbers |
| `--font-weight-normal` | `400` | Body text |
| `--font-weight-medium` | `500` | Labels, nav items |
| `--font-weight-semibold` | `600` | Page headings, card titles |
| `--font-weight-bold` | `700` | Metric values |

### 3.3 Spacing (8 px grid)

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

### 3.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, chips |
| `--radius-md` | `8px` | Cards, inputs, buttons |
| `--radius-lg` | `12px` | Modals, drawers |
| `--radius-full` | `9999px` | Avatar, toggle pill |

### 3.5 Elevation (Box Shadow)

| Level | Shadow | Usage |
|-------|--------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Cards |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.12)` | Dropdowns, tooltips |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.16)` | Modals |

---

## 4. Layout

Fixed desktop layout: 240 px sidebar + flexible main content area.

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT AREA (flex 1)    │
│  ┌────────────────────┐ │  ┌──────────────────────────┐  │
│  │  Logo / Brand      │ │  │  Page Header             │  │
│  ├────────────────────┤ │  │  (Title + Primary CTA)   │  │
│  │  ▸ Dashboard       │ │  ├──────────────────────────┤  │
│  │  ▸ Contacts        │ │  │                          │  │
│  │  ▸ Deals           │ │  │  Page Content            │  │
│  │  ▸ Activities      │ │  │  (Table / Kanban / Form) │  │
│  │  ▸ Tasks           │ │  │                          │  │
│  ├────────────────────┤ │  └──────────────────────────┘  │
│  │  [ADMIN]           │ │                                 │
│  │  ▸ Users           │ │                                 │
│  │  ▸ Tags            │ │                                 │
│  ├────────────────────┤ │                                 │
│  │  User Avatar       │ │                                 │
│  │  Name / Role       │ │                                 │
│  │  Logout            │ │                                 │
│  └────────────────────┘ │                                 │
└──────────────────────────────────────────────────────────┘
```

The sidebar is always visible and never collapses. Content area uses a max-width of 1400 px, centred with auto margins on wider screens.

---

## 5. Screens & Components

### 5.1 Login Page

**Route:** `/login`  
**Layout:** Centred card on full-page background (gradient from `--color-primary-light` to white)

**Components:**
- `<LoginCard>` — 400 px wide, `--shadow-lg`, `--radius-lg`
  - App logo + name at top
  - Email input (label above, full width)
  - Password input with show/hide toggle
  - "Sign In" primary button (full width, `--color-primary`)
  - Inline error message below password (red, `--color-danger`)
  - "Forgot password?" link (bottom, secondary text colour) — placeholder for v2

**States:**
- Default → Loading (button shows spinner, disabled) → Success (redirect) → Error (shake animation on card + inline error)

---

### 5.2 Dashboard

**Route:** `/` (default after login)  
**Layout:** 3-column grid of metric cards, then 2-column grid below

**Components:**

#### Metric Cards (top row)
3 stat cards side by side:
- "Open Deals" — count + total pipeline value
- "My Tasks Due Today" — count
- "Contacts Added This Week" — count

Each card: white background, `--shadow-sm`, `--radius-md`, icon (coloured) left, number + label right.

#### Pipeline Summary (middle)
Horizontal bar or grouped column chart:
- X-axis: deal stages (Lead, Qualified, Proposal, Negotiation, Closed Won)
- Bar height: count of deals
- Colour: `--color-primary` for active, `--color-success` for Closed Won

#### My Tasks Widget (bottom-left, 6-col)
- List of up to 5 upcoming tasks
- Each row: checkbox, title, due date chip (red if overdue, orange if today, grey if future)
- "View all tasks" link at bottom

#### Recent Activity Feed (bottom-right, 6-col)
- Chronological list of last 10 activities
- Each row: avatar/icon, activity type badge, subject, contact name, timestamp
- Activity type colour coding: Call (blue), Email (purple), Meeting (green), Note (grey)

---

### 5.3 Contacts

#### 5.3.1 Contacts List

**Route:** `/contacts`  
**Layout:** Full-width table with sticky header

**Page Header:**
- Title: "Contacts"
- Right side: Search input (with magnifier icon, 280 px wide) + "New Contact" primary button

**Table Columns:**
| Column | Content |
|--------|---------|
| Avatar | Initials circle (background from name hash) |
| Name | Full name, clickable (links to detail) |
| Company | Company name |
| Email | Email address (mailto link) |
| Phone | Phone number |
| Tags | Coloured chips (max 3 shown, +N overflow) |
| Owner | Small avatar + name |
| Actions | Edit icon, Delete icon (shown on row hover) |

**Features:**
- Click anywhere on row (except actions) → navigate to contact detail
- Hover row → show action icons
- Search bar debounced 300 ms, clears with × button
- Pagination controls at bottom (rows-per-page selector + prev/next)
- Empty state: illustration + "No contacts yet" + "Add your first contact" button

#### 5.3.2 Contact Detail

**Route:** `/contacts/:id`  
**Layout:** 2-column: left panel (details) + right panel (activity feed)

**Left Panel (3/5 width):**
- Large avatar with initials (80 px circle)
- Name (H1), job title, company (clickable)
- Action bar: Edit | Log Activity | Add Task | Delete
- Info grid: email, phone, owner, created date, tags
- Linked Deals section: list of deal cards with stage badge and value

**Right Panel (2/5 width):**
- "Activity Feed" heading with "Log Activity" button
- Chronological list of activities (scrollable)
  - Each: icon (by type), subject bold, notes preview, author + timestamp
- Tabs or accordion: Activities | Tasks

#### 5.3.3 Contact Form (Create / Edit)

**Route:** `/contacts/new` and `/contacts/:id/edit`  
**Layout:** Single centred form card (max 640 px wide) or right-side drawer

**Fields:**
- First Name* (required) + Last Name* (required) — side by side
- Email (validated format)
- Phone
- Job Title
- Company (searchable select / autocomplete)
- Owner (user select dropdown)
- Tags (multi-select chip input)
- Notes (textarea)

**Actions:** Cancel (ghost button) | Save (primary button)

---

### 5.4 Deals — Kanban Pipeline

**Route:** `/deals`  
**Layout:** Horizontal scrollable Kanban board

**Page Header:**
- Title: "Pipeline"
- "New Deal" button (top-right)

**Board Structure:**

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐
│  LEAD      │ │ QUALIFIED  │ │ PROPOSAL   │ │ NEGOTIATION  │ │ CLOSED WON │ │ CLOSED LOST│
│  4 · $12K  │ │  2 · $30K  │ │  3 · $55K  │ │   1 · $20K   │ │  6 · $90K  │ │  2 · —     │
├────────────┤ ├────────────┤ ├────────────┤ ├──────────────┤ ├────────────┤ ├────────────┤
│ [Deal Card]│ │ [Deal Card]│ │ [Deal Card]│ │  [Deal Card] │ │ [Deal Card]│ │ [Deal Card]│
│ [Deal Card]│ │            │ │            │ │              │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘ └──────────────┘ └────────────┘ └────────────┘
```

**Column Header:** Stage name (uppercase), deal count, total value  
**Column Background:** Light grey (`#F1F5F9`)  
**Column Width:** 280 px (fixed), board scrolls horizontally

**Deal Card:**
- White background, `--shadow-sm`, `--radius-md`, 8 px padding
- Title (bold, truncate after 2 lines)
- Contact name + avatar (small)
- Value (`$X,XXX`) — right aligned
- Close date (if set) — bottom, with calendar icon; red if overdue
- Drag handle icon (top-right, visible on hover)
- Click → opens Deal edit form as a drawer

**Stage Colours (column header accent):**
- Lead: `#94A3B8` (grey-blue)
- Qualified: `#3B82F6` (blue)
- Proposal: `#8B5CF6` (purple)
- Negotiation: `#F59E0B` (amber)
- Closed Won: `#10B981` (green)
- Closed Lost: `#EF4444` (red), column cards visually muted (opacity 0.6)

**Deal Form (Side Drawer):**
- Slides in from right (400 px wide)
- Fields: Title*, Value, Stage (select), Close Date (date picker), Contact (autocomplete), Owner (user select), Notes
- Save + Cancel buttons at bottom

---

### 5.5 Activities

**Route:** `/activities`  
**Layout:** Single-column feed

**Page Header:**
- Title: "Activities"
- "Log Activity" primary button

**Filter Bar:**
- Dropdown filters: Type (All / Call / Email / Meeting / Note) | Contact (search select) | Date range

**Activity Feed:**
- Each entry is a card:
  - Left: coloured icon circle (phone=blue, email=purple, calendar=green, note=grey)
  - Body: subject (bold), notes excerpt (2 lines, truncate), linked contact/deal chip
  - Meta: author avatar + name, formatted date/time ("Today at 2:30 PM" / "Jun 9")
  - Hover: Edit | Delete icons appear right side

**Log Activity Drawer (slides from right):**
- Type selector (icon tabs: Call / Email / Meeting / Note)
- Subject* input
- Notes (rich textarea)
- Contact link (optional searchable select)
- Deal link (optional searchable select)
- Date/time (defaults to now)
- Save button

---

### 5.6 Tasks

**Route:** `/tasks`  
**Layout:** List with filter tabs

**Page Header:**
- Title: "Tasks"
- "New Task" primary button

**Filter Tabs:**
- All | My Tasks | Overdue | Due Today | Upcoming | Completed

**Task List:**
Each row:
```
[✓ checkbox] | [Title]                         | [Contact/Deal chip] | [Assignee avatar] | [Due date chip] | [⋯ actions]
```

- Completed tasks: checkbox checked, title has strikethrough, row slightly muted
- Overdue: due date chip is red (`--color-danger`)
- Due today: due date chip is orange (`--color-warning`)
- Checkbox click: immediate toggle with optimistic UI

**Task Form (modal or drawer):**
- Title* input
- Description (textarea)
- Due Date (date picker with time optional)
- Assignee (user select)
- Link to Contact (optional searchable select)
- Link to Deal (optional searchable select)

---

### 5.7 Users (Admin Only)

**Route:** `/users`  
**Layout:** Table

**Page Header:**
- Title: "Team Members"
- "Invite User" button (Admin only)

**Table Columns:** Avatar, Name, Email, Role badge, Status (Active/Inactive), Joined date, Actions (Edit role / Deactivate)

**Role Badge:**
- ADMIN: `--color-primary` background, white text
- USER: grey background, dark text

---

### 5.8 Tags (Admin Only)

**Route:** `/tags` (or modal from Settings)

**Layout:** Simple list with colour swatches

Each row: Colour circle swatch | Tag name | Contact count | Delete icon  
"New Tag" button opens inline input (name + colour picker)

---

## 6. Reusable Components

### 6.1 Button Variants

| Variant | Visual |
|---------|--------|
| Primary | Filled `--color-primary`, white text, `--radius-md` |
| Secondary | White background, `--color-border` border, dark text |
| Danger | Filled `--color-danger`, white text |
| Ghost | Transparent, `--color-text-secondary`, no border |
| Icon | 32×32 px circle, single icon, ghost hover |

### 6.2 Input Fields

- Label: above input, `--font-size-sm`, `--color-text-secondary`
- Input height: 40 px, `--radius-md` border, 1 px `--color-border`
- Focus ring: 2 px `--color-primary` outline
- Error state: red border + red helper text below
- Disabled: `--color-background` fill, `--color-text-disabled` text

### 6.3 Tag / Status Chips

- Coloured pill: custom background colour, white text, `--radius-full`, `--font-size-xs`
- Stage badge: same pattern, stage-specific colours (see §5.4)

### 6.4 Avatar

- Circle, initials from first + last name
- Background: deterministic colour from name hash (10 preset colours)
- Sizes: 24 px (inline), 32 px (table row), 48 px (card), 80 px (detail page)

### 6.5 Toast Notifications

- Appear top-right, slide-in animation
- Auto-dismiss after 4 seconds
- Types: Success (green left border), Error (red left border), Info (blue left border)
- Max 3 visible at once; oldest dismissed on overflow

### 6.6 Confirm Dialog

- Modal overlay (backdrop blur)
- Title (e.g., "Delete Contact?"), descriptive message
- Cancel (secondary) + Confirm (danger) buttons
- `--shadow-lg`, `--radius-lg`, max-width 400 px

### 6.7 Empty States

Each has: illustration (line-art SVG), heading ("No contacts yet"), subtext, CTA button  
Consistent vertical centering within content area.

### 6.8 Skeleton Loaders

Replace content while fetching. Match the shape of the content:
- Table rows: grey bars at 70% and 40% width alternating
- Cards: grey rectangle placeholders
- Animated shimmer gradient left → right

### 6.9 Search / Autocomplete Input

- Magnifier icon prefix
- Clear (×) icon suffix when value is set
- Dropdown list of results (max 8 visible, scrollable)
- Loading spinner while fetching
- "No results" state

---

## 7. Navigation & Information Architecture

```
/login              → Login page (unauthenticated only)

/ (dashboard)       → Dashboard summary
/contacts           → Contact list
/contacts/new       → Create contact (or drawer)
/contacts/:id       → Contact detail
/contacts/:id/edit  → Edit contact (or drawer)

/deals              → Kanban pipeline
/deals/new          → Create deal (drawer)
/deals/:id/edit     → Edit deal (drawer)

/activities         → Global activity feed
/tasks              → Task list

/users              → User management (ADMIN)
/tags               → Tag management (ADMIN)

/profile            → Current user profile
```

---

## 8. Key Interaction Patterns

### 8.1 Drawers vs. Full Pages
- **Use drawers** (right-slide panel, 400 px wide) for: creating/editing a Deal, logging an Activity, creating/editing a Task, creating a Tag
- **Use full pages** for: Contact create/edit (complex form with many fields), Contact detail view
- Drawers overlay content without full navigation; close with × or click outside

### 8.2 Optimistic UI
Apply immediately in the UI before server confirms:
- Task complete toggle
- Deal stage change (Kanban drag)
- Revert on server error with a toast

### 8.3 Inline Editing
Contact detail: Name and title fields can be clicked to enter inline edit mode (click-to-edit pattern). Other fields use the full edit form.

### 8.4 Drag and Drop (Kanban)
- Grab handle appears on card hover
- Card lifts (shadow increases, slight scale 1.02) while dragging
- Target column highlights with a dashed border
- Cards in target column shift down to show drop position

---

## 9. Accessibility

- All interactive elements are keyboard navigable (Tab order, Enter/Space activation)
- Focus rings visible (2 px outline) — never `outline: none` without an alternative
- Colour contrast ≥ 4.5:1 for all text
- All icons have `aria-label` or adjacent visible text
- Form inputs have associated `<label>` elements
- Modal traps focus until dismissed
- Status messages announced via ARIA live regions

---

## 10. Animation & Motion

| Element | Animation |
|---------|-----------|
| Page transition | Fade-in 150 ms |
| Drawer open/close | Slide from right 250 ms ease-out |
| Modal open | Scale from 0.95 + fade-in 200 ms |
| Toast notification | Slide down from top 200 ms |
| Kanban card drag | Scale 1.02 + shadow increase |
| Checkbox toggle | Checkmark draw 150 ms |
| Skeleton loader | Shimmer left-to-right 1.5 s loop |

Honour `prefers-reduced-motion` — skip or reduce all transitions when set.

---

## 11. File / Asset Handoff Checklist (for stitch.ai)

The following should be produced in the design output:

- [ ] Component library with all states (default, hover, focus, disabled, error)
- [ ] All 8 screens (Login, Dashboard, Contact List, Contact Detail, Contact Form, Deal Board, Task List, Activity Feed) at desktop resolution (1440 px width)
- [ ] Drawer designs (Deal form, Activity form, Task form)
- [ ] Modal designs (Confirm dialog)
- [ ] Empty state illustrations for each main list view
- [ ] Toast notification examples (success, error)
- [ ] Design token export (colours, typography, spacing) as CSS variables or JSON
- [ ] Icon set reference (Material Icons or Heroicons recommended)
