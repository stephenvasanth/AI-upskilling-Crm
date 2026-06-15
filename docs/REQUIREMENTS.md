# CRM Application — Requirements Document

**Version:** 1.1  
**Date:** 2026-06-15  
**Author:** Architect  
**Status:** Draft — synced with implementation

> **Sync note (2026-06-15):** Sections 3.3, 3.2 (CON-03), 3.5 (ACT-04), and the
> permissions matrix have been updated to reflect the current implementation.
> Items deferred to a future release are marked *Deferred*.

---

## 1. Executive Summary

A web-based Customer Relationship Management (CRM) system for small teams (2–10 users), designed for desktop browsers. The system centralises contact management, sales pipeline tracking, activity logging, and task management in a single application secured by role-based authentication.

---

## 2. Stakeholders

| Role | Responsibilities |
|------|-----------------|
| Admin | Manage users, tags, and system settings |
| User | Manage contacts, deals, activities, and personal tasks |

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Users can log in with email and password | Must Have |
| AUTH-02 | JWT tokens expire after 24 hours; the user is redirected to login on expiry | Must Have |
| AUTH-03 | Passwords are stored as BCrypt hashes; plaintext passwords are never persisted | Must Have |
| AUTH-04 | An Admin can create new user accounts | Must Have |
| AUTH-05 | An Admin can deactivate (soft-delete) a user account | Must Have |
| AUTH-06 | An Admin can change a user's role (ADMIN / USER) | Must Have |
| AUTH-07 | A User can view and update their own profile (name, password) | Must Have |
| AUTH-08 | Failed logins return a generic error; no hint whether email or password was wrong | Should Have |
| AUTH-09 | Session is invalidated client-side on logout (token removed from storage) | Must Have |

### 3.2 Contacts

| ID | Requirement | Priority |
|----|-------------|----------|
| CON-01 | Users can create a Contact with: first name, last name, email, phone, job title, company, owner, tags | Must Have |
| CON-02 | Users can edit any field on a Contact | Must Have |
| CON-03 | Users can delete a Contact. This is a hard delete: the Contact record and any directly-linked Activities are removed; linked Tasks are preserved with their Contact reference cleared | Must Have |
| CON-04 | Users can search Contacts by name, email, or company with real-time filtering (debounced 300 ms) | Must Have |
| CON-05 | Users can filter Contacts by tag | Should Have |
| CON-06 | Contacts list is paginated (default 20 per page) | Must Have |
| CON-07 | Each Contact has a detail view showing linked deals, activities, and tasks | Must Have |
| CON-08 | Users can link a Contact to a Company | Must Have |
| CON-09 | Users can assign multiple tags to a Contact | Must Have |
| CON-10 | Users can upload/replace a Contact avatar (image) | Nice to Have |

### 3.3 Companies

> **Implementation note:** Companies are implemented as a read-only lookup
> (id + name) used to populate the company picker on the Contact form
> (CON-08). Full company management (extended fields, create/edit/delete,
> detail view) is deferred to a future release.

| ID | Requirement | Priority |
|----|-------------|----------|
| COM-01 | The system maintains a list of Companies (name) that Users can select when creating or editing a Contact | Must Have |
| COM-02 | *Deferred* — Users can create, edit, and delete a Company (with industry, website, phone, billing address) | Future |
| COM-03 | *Deferred* — A Company detail view lists all associated Contacts | Future |

### 3.4 Deals / Pipeline

| ID | Requirement | Priority |
|----|-------------|----------|
| DEA-01 | Users can create a Deal with: title, value (currency), stage, expected close date, linked contact, owner | Must Have |
| DEA-02 | Deals are visualised as a Kanban board with columns per stage | Must Have |
| DEA-03 | Deal stages (in order): Lead → Qualified → Proposal → Negotiation → Closed Won → Closed Lost | Must Have |
| DEA-04 | Users can drag-and-drop a Deal card between stages | Should Have |
| DEA-05 | Each stage column shows the count and total value of Deals in that stage | Must Have |
| DEA-06 | Users can edit Deal details via an inline form or dedicated page | Must Have |
| DEA-07 | Closed Lost deals are visually distinguished (muted / greyed out) | Should Have |
| DEA-08 | Users can delete a Deal | Must Have |

### 3.5 Activities

| ID | Requirement | Priority |
|----|-------------|----------|
| ACT-01 | Users can log an Activity of type: Call, Email, Meeting, Note | Must Have |
| ACT-02 | Each Activity has: type, subject, body/notes, date/time, linked contact (optional), linked deal (optional), author | Must Have |
| ACT-03 | Activities are displayed as a chronological feed per Contact or Deal | Must Have |
| ACT-04 | Users can delete an Activity. *(Editing an existing Activity, and restricting deletion to the Activity's author, are deferred to a future release.)* | Must Have |
| ACT-05 | Global activity feed shows all recent activities across contacts/deals (paginated) | Should Have |

### 3.6 Tasks

| ID | Requirement | Priority |
|----|-------------|----------|
| TSK-01 | Users can create a Task with: title, description, due date, assignee (team member), linked contact (optional), linked deal (optional) | Must Have |
| TSK-02 | Users can mark a Task complete / incomplete (toggle) | Must Have |
| TSK-03 | Users can edit and delete Tasks | Must Have |
| TSK-04 | Tasks list can be filtered by: assignee, completion status, due date (overdue / today / upcoming) | Must Have |
| TSK-05 | Overdue incomplete Tasks are visually highlighted | Must Have |
| TSK-06 | Users see their own Tasks on a personal dashboard widget | Should Have |

### 3.7 Tags

| ID | Requirement | Priority |
|----|-------------|----------|
| TAG-01 | Admin can create a Tag with name and colour | Must Have |
| TAG-02 | Admin can delete a Tag (removed from all Contacts automatically) | Must Have |
| TAG-03 | Tags are displayed as coloured chips on Contact cards and detail views | Must Have |

### 3.8 Dashboard / Home

| ID | Requirement | Priority |
|----|-------------|----------|
| DSH-01 | Dashboard shows: My open tasks (count + list), Recent activities (last 10), Pipeline summary (deals by stage count + value) | Should Have |
| DSH-02 | Dashboard is the default landing page after login | Should Have |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement |
|----|------------|
| NFR-P01 | Contact list search results return within 500 ms for up to 10,000 contacts |
| NFR-P02 | Deal pipeline view loads within 1 second |
| NFR-P03 | Frequently read data is served from Redis cache (cache-first, fall back to DB on miss); cache TTL = 24 hours, invalidated on writes (see crm-service/rules.md, Caching Strategy section) |
| NFR-P04 | Frontend bundle size (initial load) < 500 KB gzipped |

### 4.2 Security

| ID | Requirement |
|----|------------|
| NFR-S01 | All API endpoints except `/api/auth/login` require a valid JWT |
| NFR-S02 | ADMIN-only endpoints return HTTP 403 when accessed by a USER role |
| NFR-S03 | CORS is restricted to the known frontend origin(s) |
| NFR-S04 | Passwords meet minimum complexity: 8+ characters |
| NFR-S05 | All data in transit over HTTPS in production |
| NFR-S06 | No sensitive data (tokens, passwords) logged at any log level |

### 4.3 Usability

| ID | Requirement |
|----|------------|
| NFR-U01 | Application is designed for desktop browsers (Chrome, Firefox, Edge latest), minimum supported width 1280 px, optimised for 1440 px+ |
| NFR-U02 | All forms show inline validation errors before submission |
| NFR-U03 | Destructive actions (delete) require confirmation dialog |
| NFR-U04 | Loading states are shown for all async operations |
| NFR-U05 | Empty states include a call-to-action (e.g., "No contacts yet — Add one") |

### 4.4 Reliability

| ID | Requirement |
|----|------------|
| NFR-R01 | Backend returns structured JSON error responses (never HTML error pages) |
| NFR-R02 | Frontend shows a user-friendly error message on API failures |
| NFR-R03 | Database migrations are idempotent and run automatically on startup |

---

## 5. User Roles & Permissions Matrix

| Feature | USER | ADMIN |
|---------|------|-------|
| Login / Logout | Yes | Yes |
| View / Edit own profile | Yes | Yes |
| Create / Edit / Delete contacts | Yes | Yes |
| View companies (lookup list) | Yes | Yes |
| Create / Edit / Delete companies *(Deferred — COM-02)* | — | — |
| Create / Edit / Delete deals | Yes | Yes |
| Create / Edit / Delete activities | Yes | Yes |
| Create / Edit / Delete tasks | Yes | Yes |
| View all users | No | Yes |
| Create / Deactivate users | No | Yes |
| Manage tags | No | Yes |

---

## 6. Key User Flows

### 6.1 Login Flow
1. User navigates to `/login`
2. Enters email + password → clicks Sign In
3. On success: JWT stored in localStorage; redirect to `/dashboard`
4. On failure: inline error displayed; form stays visible

### 6.2 Add Contact Flow
1. Click "New Contact" from Contacts list
2. Fill form (first name + last name required; email optional but validated if entered)
3. Optionally link to a company, assign tags, set owner
4. Save → redirect to Contact detail view
5. Success toast notification shown

### 6.3 Move a Deal Through the Pipeline
1. Open Deal Board (`/deals`)
2. Locate deal card in current stage column
3. Drag card to new stage column (or use stage dropdown on card)
4. Stage updates immediately (optimistic UI); synced to server
5. Stage total and count recalculate

### 6.4 Log an Activity
1. Open a Contact or Deal detail view
2. Click "Log Activity" in the activity feed section
3. Select type (Call / Email / Meeting / Note)
4. Enter subject + notes
5. Save → activity appears at top of feed

### 6.5 Create & Complete a Task
1. Navigate to Tasks list or open a Contact/Deal
2. Click "New Task" → fill title, due date, assignee
3. Save → task appears in list
4. Click checkbox to mark complete → row greys out / moves to completed section

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| Contact | An individual person tracked in the CRM |
| Company | An organisation that one or more Contacts belong to |
| Deal | A sales opportunity linked to a Contact and progressing through pipeline stages |
| Activity | A logged interaction (call, email, meeting, note) against a Contact or Deal |
| Task | An actionable to-do item with a due date and assignee |
| Tag | A coloured label that can be applied to one or more Contacts |
| Pipeline | The Kanban view of all active Deals organised by stage |
| Owner | The team member responsible for a Contact or Deal |
