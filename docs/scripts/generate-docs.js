const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageBreak,
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GREY = '64748B';
const WHITE = 'FFFFFF';
const HEADER_BG = '4F46E5';
const ALT_ROW = 'F8FAFC';

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
  });
}

function h4(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_4,
    spacing: { before: 200, after: 80 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: opts.color || '1E293B', bold: opts.bold, italics: opts.italic })],
    spacing: { before: 80, after: 80 },
    indent: opts.indent ? { left: 720 } : undefined,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    text,
    bullet: { level },
    spacing: { before: 60, after: 60 },
    indent: { left: 720 * (level + 1) },
    run: { size: 22, color: '1E293B' },
  });
}

function divider() {
  return new Paragraph({
    text: '',
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } },
    spacing: { before: 200, after: 200 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function styledTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: HEADER_BG },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })],
          alignment: AlignmentType.LEFT,
          spacing: { before: 80, after: 80 },
        })],
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? WHITE : ALT_ROW },
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell), size: 20, color: '1E293B' })],
            spacing: { before: 60, after: 60 },
          })],
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

const docStyles = {
  default: {
    document: { run: { font: 'Calibri', size: 22 } },
  },
  paragraphStyles: [
    {
      id: 'Heading1',
      name: 'Heading 1',
      basedOn: 'Normal',
      run: { size: 36, bold: true, color: HEADER_BG },
      paragraph: { spacing: { before: 400, after: 160 } },
    },
    {
      id: 'Heading2',
      name: 'Heading 2',
      basedOn: 'Normal',
      run: { size: 28, bold: true, color: '1E293B' },
      paragraph: { spacing: { before: 320, after: 120 } },
    },
    {
      id: 'Heading3',
      name: 'Heading 3',
      basedOn: 'Normal',
      run: { size: 24, bold: true, color: '334155' },
      paragraph: { spacing: { before: 240, after: 80 } },
    },
    {
      id: 'Heading4',
      name: 'Heading 4',
      basedOn: 'Normal',
      run: { size: 22, bold: true, color: '475569' },
      paragraph: { spacing: { before: 200, after: 60 } },
    },
  ],
};

const pageProps = {
  properties: {
    page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
  },
};

function titleBlock(title, subtitle, meta) {
  return [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 56, color: HEADER_BG })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: subtitle, size: 36, color: GREY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: meta, size: 20, color: GREY, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
    }),
    divider(),
  ];
}

// ─── REQUIREMENTS DOCUMENT ───────────────────────────────────────────────────

function buildRequirementsDoc() {
  const children = [
    ...titleBlock('CRM Application', 'Requirements Document', 'Version 1.0  ·  2026-06-11  ·  Status: Draft'),

    h1('1. Executive Summary'),
    body('A web-based Customer Relationship Management (CRM) system for small teams (2–10 users), designed for desktop browsers. The system centralises contact management, sales pipeline tracking, activity logging, and task management in a single application secured by role-based authentication.'),

    h1('2. Stakeholders'),
    styledTable(
      ['Role', 'Responsibilities'],
      [
        ['Admin', 'Manage users, tags, and system settings'],
        ['User', 'Manage contacts, deals, activities, and personal tasks'],
      ],
      [2000, 7000]
    ),

    pageBreak(),
    h1('3. Functional Requirements'),

    h2('3.1 Authentication & User Management'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['AUTH-01', 'Users can log in with email and password', 'Must Have'],
        ['AUTH-02', 'JWT tokens expire after 24 hours; user is redirected to login on expiry', 'Must Have'],
        ['AUTH-03', 'Passwords stored as BCrypt hashes; plaintext never persisted', 'Must Have'],
        ['AUTH-04', 'An Admin can create new user accounts', 'Must Have'],
        ['AUTH-05', 'An Admin can deactivate (soft-delete) a user account', 'Must Have'],
        ['AUTH-06', 'An Admin can change a user\'s role (ADMIN / USER)', 'Must Have'],
        ['AUTH-07', 'A User can view and update their own profile (name, password)', 'Must Have'],
        ['AUTH-08', 'Failed logins return a generic error — no hint of email vs. password', 'Should Have'],
        ['AUTH-09', 'Session is invalidated client-side on logout (token removed from storage)', 'Must Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.2 Contacts'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['CON-01', 'Create a Contact: first name, last name, email, phone, job title, company, owner, tags', 'Must Have'],
        ['CON-02', 'Edit any field on a Contact', 'Must Have'],
        ['CON-03', 'Delete a Contact (soft delete; preserves linked activities/tasks)', 'Must Have'],
        ['CON-04', 'Search Contacts by name, email, or company with real-time filtering (debounced 300 ms)', 'Must Have'],
        ['CON-05', 'Filter Contacts by tag', 'Should Have'],
        ['CON-06', 'Contacts list is paginated (default 20 per page)', 'Must Have'],
        ['CON-07', 'Contact detail view shows linked deals, activities, and tasks', 'Must Have'],
        ['CON-08', 'Link a Contact to a Company', 'Must Have'],
        ['CON-09', 'Assign multiple tags to a Contact', 'Must Have'],
        ['CON-10', 'Upload/replace a Contact avatar image', 'Nice to Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.3 Companies'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['COM-01', 'Create a Company: name, industry, website, phone, billing address', 'Must Have'],
        ['COM-02', 'Edit and delete a Company', 'Must Have'],
        ['COM-03', 'Company detail view lists all associated Contacts', 'Should Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.4 Deals / Pipeline'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['DEA-01', 'Create a Deal: title, value, stage, expected close date, linked contact, owner', 'Must Have'],
        ['DEA-02', 'Deals visualised as a Kanban board with columns per stage', 'Must Have'],
        ['DEA-03', 'Deal stages (in order): Lead → Qualified → Proposal → Negotiation → Closed Won → Closed Lost', 'Must Have'],
        ['DEA-04', 'Drag-and-drop a Deal card between stages', 'Should Have'],
        ['DEA-05', 'Each stage column shows count and total value of Deals', 'Must Have'],
        ['DEA-06', 'Edit Deal details via inline form or dedicated page', 'Must Have'],
        ['DEA-07', 'Closed Lost deals are visually distinguished (muted / greyed out)', 'Should Have'],
        ['DEA-08', 'Delete a Deal', 'Must Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.5 Activities'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['ACT-01', 'Log an Activity of type: Call, Email, Meeting, Note', 'Must Have'],
        ['ACT-02', 'Activity fields: type, subject, body/notes, date/time, linked contact, linked deal, author', 'Must Have'],
        ['ACT-03', 'Activities displayed as a chronological feed per Contact or Deal', 'Must Have'],
        ['ACT-04', 'Edit and delete own Activities', 'Must Have'],
        ['ACT-05', 'Global activity feed across all contacts/deals (paginated)', 'Should Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.6 Tasks'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['TSK-01', 'Create a Task: title, description, due date, assignee, linked contact, linked deal', 'Must Have'],
        ['TSK-02', 'Mark a Task complete / incomplete (toggle)', 'Must Have'],
        ['TSK-03', 'Edit and delete Tasks', 'Must Have'],
        ['TSK-04', 'Filter Tasks by: assignee, completion status, due date (overdue / today / upcoming)', 'Must Have'],
        ['TSK-05', 'Overdue incomplete Tasks are visually highlighted', 'Must Have'],
        ['TSK-06', 'Personal dashboard widget showing user\'s own tasks', 'Should Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.7 Tags'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['TAG-01', 'Admin creates a Tag with name and colour', 'Must Have'],
        ['TAG-02', 'Admin deletes a Tag (removed from all Contacts automatically)', 'Must Have'],
        ['TAG-03', 'Tags displayed as coloured chips on Contact cards and detail views', 'Must Have'],
      ],
      [1200, 6800, 1500]
    ),

    h2('3.8 Dashboard / Home'),
    styledTable(
      ['ID', 'Requirement', 'Priority'],
      [
        ['DSH-01', 'Dashboard shows: My open tasks, Recent activities (last 10), Pipeline summary by stage', 'Should Have'],
        ['DSH-02', 'Dashboard is the default landing page after login', 'Should Have'],
      ],
      [1200, 6800, 1500]
    ),

    pageBreak(),
    h1('4. Non-Functional Requirements'),

    h2('4.1 Performance'),
    styledTable(
      ['ID', 'Requirement'],
      [
        ['NFR-P01', 'Contact list search results return within 500 ms for up to 10,000 contacts'],
        ['NFR-P02', 'Deal pipeline view loads within 1 second'],
        ['NFR-P03', 'Frequently read data served from Redis cache (cache-first, fall back to DB on miss); TTL = 24 hours, invalidated on writes'],
        ['NFR-P04', 'Frontend bundle size (initial load) < 500 KB gzipped'],
      ],
      [1500, 8000]
    ),

    h2('4.2 Security'),
    styledTable(
      ['ID', 'Requirement'],
      [
        ['NFR-S01', 'All API endpoints except /api/auth/login require a valid JWT'],
        ['NFR-S02', 'ADMIN-only endpoints return HTTP 403 when accessed by a USER role'],
        ['NFR-S03', 'CORS restricted to known frontend origin(s)'],
        ['NFR-S04', 'Passwords meet minimum complexity: 8+ characters'],
        ['NFR-S05', 'All data in transit over HTTPS in production'],
        ['NFR-S06', 'No sensitive data (tokens, passwords) logged at any log level'],
      ],
      [1500, 8000]
    ),

    h2('4.3 Usability'),
    styledTable(
      ['ID', 'Requirement'],
      [
        ['NFR-U01', 'Application is designed for desktop browsers (Chrome, Firefox, Edge latest), minimum supported width 1280 px, optimised for 1440 px+'],
        ['NFR-U02', 'All forms show inline validation errors before submission'],
        ['NFR-U03', 'Destructive actions (delete) require confirmation dialog'],
        ['NFR-U04', 'Loading states shown for all async operations'],
        ['NFR-U05', 'Empty states include a call-to-action'],
      ],
      [1500, 8000]
    ),

    h2('4.4 Reliability'),
    styledTable(
      ['ID', 'Requirement'],
      [
        ['NFR-R01', 'Backend returns structured JSON error responses (never HTML error pages)'],
        ['NFR-R02', 'Frontend shows a user-friendly error message on API failures'],
        ['NFR-R03', 'Database migrations are idempotent and run automatically on startup'],
      ],
      [1500, 8000]
    ),

    pageBreak(),
    h1('5. User Roles & Permissions Matrix'),
    styledTable(
      ['Feature', 'USER', 'ADMIN'],
      [
        ['Login / Logout', 'Yes', 'Yes'],
        ['View / Edit own profile', 'Yes', 'Yes'],
        ['Create / Edit / Delete contacts', 'Yes', 'Yes'],
        ['Create / Edit / Delete companies', 'Yes', 'Yes'],
        ['Create / Edit / Delete deals', 'Yes', 'Yes'],
        ['Create / Edit / Delete activities', 'Yes', 'Yes'],
        ['Create / Edit / Delete tasks', 'Yes', 'Yes'],
        ['View all users', 'No', 'Yes'],
        ['Create / Deactivate users', 'No', 'Yes'],
        ['Manage tags', 'No', 'Yes'],
      ],
      [6000, 1500, 1500]
    ),

    pageBreak(),
    h1('6. Key User Flows'),

    h2('6.1 Login Flow'),
    bullet('User navigates to /login'),
    bullet('Enters email + password → clicks Sign In'),
    bullet('On success: JWT stored in localStorage; redirect to /dashboard'),
    bullet('On failure: inline error displayed; form stays visible'),

    h2('6.2 Add Contact Flow'),
    bullet('Click "New Contact" from Contacts list'),
    bullet('Fill form (first name + last name required; email optional but validated if entered)'),
    bullet('Optionally link to a company, assign tags, set owner'),
    bullet('Save → redirect to Contact detail view'),
    bullet('Success toast notification shown'),

    h2('6.3 Move a Deal Through the Pipeline'),
    bullet('Open Deal Board (/deals)'),
    bullet('Locate deal card in current stage column'),
    bullet('Drag card to new stage column (or use stage dropdown on card)'),
    bullet('Stage updates immediately (optimistic UI); synced to server'),
    bullet('Stage total and count recalculate'),

    h2('6.4 Log an Activity'),
    bullet('Open a Contact or Deal detail view'),
    bullet('Click "Log Activity" in the activity feed section'),
    bullet('Select type (Call / Email / Meeting / Note)'),
    bullet('Enter subject + notes'),
    bullet('Save → activity appears at top of feed'),

    h2('6.5 Create & Complete a Task'),
    bullet('Navigate to Tasks list or open a Contact/Deal'),
    bullet('Click "New Task" → fill title, due date, assignee'),
    bullet('Save → task appears in list'),
    bullet('Click checkbox to mark complete → row greys out / moves to completed section'),

    pageBreak(),
    h1('7. Glossary'),
    styledTable(
      ['Term', 'Definition'],
      [
        ['Contact', 'An individual person tracked in the CRM'],
        ['Company', 'An organisation that one or more Contacts belong to'],
        ['Deal', 'A sales opportunity linked to a Contact and progressing through pipeline stages'],
        ['Activity', 'A logged interaction (call, email, meeting, note) against a Contact or Deal'],
        ['Task', 'An actionable to-do item with a due date and assignee'],
        ['Tag', 'A coloured label that can be applied to one or more Contacts'],
        ['Pipeline', 'The Kanban view of all active Deals organised by stage'],
        ['Owner', 'The team member responsible for a Contact or Deal'],
      ],
      [2000, 7000]
    ),
  ];

  return new Document({
    styles: docStyles,
    sections: [{ properties: pageProps.properties, children }],
  });
}

// ─── DESIGN DOCUMENT ─────────────────────────────────────────────────────────

function buildDesignDoc() {
  const children = [
    ...titleBlock('CRM Application', 'Design Document', 'Version 1.0  ·  2026-06-11  ·  For UI/UX Design (stitch.ai)'),

    h1('1. Application Overview'),
    body('A single-page web application (SPA) for CRM, designed for desktop browsers only. Users interact with five core modules — Dashboard, Contacts, Deals (Kanban), Activities, and Tasks — through a persistent left sidebar. The visual language is clean, data-dense, and professional; inspired by modern tools like Linear and HubSpot.'),
    body('Target resolution: minimum supported width 1280 px, optimised for 1440 px and above. Mobile and tablet layouts are out of scope for this version.', { italic: true }),

    h1('2. Design Principles'),
    bullet('Clarity over decoration — data is the content; UI chrome is minimal'),
    bullet('Consistent spatial rhythm — 8 px base grid throughout'),
    bullet('Progressive disclosure — show summaries in lists, full detail on click'),
    bullet('Actionable empty states — every empty view includes a clear CTA'),
    bullet('Feedback on every action — toasts for success, inline errors for validation, skeletons for loading'),

    pageBreak(),
    h1('3. Design Tokens'),

    h2('3.1 Colour Palette'),
    styledTable(
      ['Token', 'Hex', 'Usage'],
      [
        ['--color-primary', '#4F46E5', 'Primary buttons, active nav, links'],
        ['--color-primary-light', '#EEF2FF', 'Hover states, active backgrounds'],
        ['--color-primary-dark', '#3730A3', 'Pressed states'],
        ['--color-success', '#10B981', 'Closed Won badge, completed tasks'],
        ['--color-danger', '#EF4444', 'Closed Lost badge, delete actions, errors'],
        ['--color-warning', '#F59E0B', 'Overdue tasks, low-priority alerts'],
        ['--color-info', '#3B82F6', 'Informational toasts, tooltips'],
        ['--color-surface', '#FFFFFF', 'Card and modal backgrounds'],
        ['--color-background', '#F8FAFC', 'Page background'],
        ['--color-border', '#E2E8F0', 'Dividers, input borders'],
        ['--color-text-primary', '#1E293B', 'Headings, labels'],
        ['--color-text-secondary', '#64748B', 'Secondary text, timestamps'],
        ['--color-text-disabled', '#CBD5E1', 'Disabled inputs, placeholder'],
        ['--color-sidebar-bg', '#1E1B4B', 'Sidebar background (dark)'],
        ['--color-sidebar-text', '#C7D2FE', 'Sidebar nav item text'],
        ['--color-sidebar-active', '#4F46E5', 'Active sidebar item highlight'],
      ],
      [3000, 1500, 5000]
    ),

    h2('3.2 Typography'),
    styledTable(
      ['Token', 'Value', 'Usage'],
      [
        ['--font-family', 'Inter, system-ui, sans-serif', 'All text'],
        ['--font-size-xs', '11px', 'Timestamps, badges'],
        ['--font-size-sm', '13px', 'Table cells, secondary labels'],
        ['--font-size-base', '14px', 'Body text, form inputs'],
        ['--font-size-md', '16px', 'Card titles, section headings'],
        ['--font-size-lg', '20px', 'Page titles'],
        ['--font-size-xl', '24px', 'Dashboard metric numbers'],
        ['--font-weight-normal', '400', 'Body text'],
        ['--font-weight-medium', '500', 'Labels, nav items'],
        ['--font-weight-semibold', '600', 'Page headings, card titles'],
        ['--font-weight-bold', '700', 'Metric values'],
      ],
      [3000, 2000, 4500]
    ),

    h2('3.3 Spacing (8 px grid)'),
    styledTable(
      ['Token', 'Value'],
      [
        ['--space-1', '4px'], ['--space-2', '8px'], ['--space-3', '12px'],
        ['--space-4', '16px'], ['--space-5', '20px'], ['--space-6', '24px'],
        ['--space-8', '32px'], ['--space-10', '40px'], ['--space-12', '48px'],
      ],
      [3000, 6500]
    ),

    h2('3.4 Border Radius'),
    styledTable(
      ['Token', 'Value', 'Usage'],
      [
        ['--radius-sm', '4px', 'Badges, chips'],
        ['--radius-md', '8px', 'Cards, inputs, buttons'],
        ['--radius-lg', '12px', 'Modals, drawers'],
        ['--radius-full', '9999px', 'Avatar, toggle pill'],
      ],
      [3000, 1500, 5000]
    ),

    h2('3.5 Elevation (Box Shadow)'),
    styledTable(
      ['Level', 'Shadow', 'Usage'],
      [
        ['--shadow-sm', '0 1px 3px rgba(0,0,0,0.08)', 'Cards'],
        ['--shadow-md', '0 4px 12px rgba(0,0,0,0.12)', 'Dropdowns, tooltips'],
        ['--shadow-lg', '0 8px 32px rgba(0,0,0,0.16)', 'Modals'],
      ],
      [2000, 4000, 3500]
    ),

    pageBreak(),
    h1('4. Layout'),
    body('Fixed desktop layout: 240 px sidebar + flexible main content area.'),
    body('The sidebar is always visible and never collapses. Content area uses a max-width of 1400 px, centred with auto margins on wider screens.'),

    pageBreak(),
    h1('5. Screens & Components'),

    h2('5.1 Login Page'),
    body('Route: /login', { bold: true }),
    body('Layout: Centred card on full-page background (gradient from --color-primary-light to white).'),
    h4('Components'),
    bullet('LoginCard — 400 px wide, --shadow-lg, --radius-lg'),
    bullet('App logo + name at top', 1),
    bullet('Email input (label above, full width)', 1),
    bullet('Password input with show/hide toggle', 1),
    bullet('"Sign In" primary button (full width, --color-primary)', 1),
    bullet('Inline error message below password (red, --color-danger)', 1),
    bullet('"Forgot password?" link — placeholder for v2', 1),
    h4('States'),
    bullet('Default → Loading (button spinner, disabled) → Success (redirect) → Error (shake animation + inline error)'),

    h2('5.2 Dashboard'),
    body('Route: / (default after login)', { bold: true }),
    body('Layout: 3-column metric cards (top), then 2-column grid below.'),
    h4('Metric Cards (top row)'),
    bullet('"Open Deals" — count + total pipeline value'),
    bullet('"My Tasks Due Today" — count'),
    bullet('"Contacts Added This Week" — count'),
    body('Each card: white background, --shadow-sm, --radius-md, icon left, number + label right.'),
    h4('Pipeline Summary'),
    bullet('Horizontal bar chart or grouped columns by deal stage'),
    bullet('--color-primary for active stages, --color-success for Closed Won'),
    h4('My Tasks Widget (bottom-left)'),
    bullet('Up to 5 upcoming tasks'),
    bullet('Each row: checkbox, title, due date chip (red=overdue, orange=today, grey=future)'),
    h4('Recent Activity Feed (bottom-right)'),
    bullet('Last 10 activities: avatar/icon, type badge, subject, contact name, timestamp'),
    bullet('Activity type colour coding: Call (blue), Email (purple), Meeting (green), Note (grey)'),

    h2('5.3 Contacts'),
    h3('5.3.1 Contacts List'),
    body('Route: /contacts', { bold: true }),
    styledTable(
      ['Column', 'Content'],
      [
        ['Avatar', 'Initials circle (background derived from name)'],
        ['Name', 'Full name, clickable link to detail view'],
        ['Company', 'Company name'],
        ['Email', 'Email address (mailto link)'],
        ['Phone', 'Phone number'],
        ['Tags', 'Coloured chips (max 3 shown, +N overflow)'],
        ['Owner', 'Small avatar + name'],
        ['Actions', 'Edit icon, Delete icon (shown on row hover)'],
      ],
      [2500, 7000]
    ),
    bullet('Click row → Contact detail'),
    bullet('Search bar debounced 300 ms, clears with × button'),
    bullet('Pagination controls at bottom (rows-per-page selector + prev/next)'),
    bullet('Empty state: illustration + "No contacts yet" + "Add your first contact" button'),

    h3('5.3.2 Contact Detail'),
    body('Route: /contacts/:id', { bold: true }),
    body('Layout: 2-column — left panel (3/5 width) details + right panel (2/5 width) activity feed.'),
    h4('Left Panel'),
    bullet('Large avatar with initials (80 px circle)'),
    bullet('Name (H1), job title, company (clickable)'),
    bullet('Action bar: Edit | Log Activity | Add Task | Delete'),
    bullet('Info grid: email, phone, owner, created date, tags'),
    bullet('Linked Deals section: deal cards with stage badge and value'),
    h4('Right Panel'),
    bullet('"Activity Feed" heading with "Log Activity" button'),
    bullet('Chronological list: icon (by type), subject bold, notes preview, author + timestamp'),
    bullet('Tabs or accordion: Activities | Tasks'),

    h3('5.3.3 Contact Form (Create / Edit)'),
    body('Route: /contacts/new and /contacts/:id/edit  |  Layout: single centred form card (max 640 px) or right-side drawer', { bold: true }),
    styledTable(
      ['Field', 'Notes'],
      [
        ['First Name + Last Name', 'Required, side by side'],
        ['Email', 'Validated format'],
        ['Phone', 'Optional'],
        ['Job Title', 'Optional'],
        ['Company', 'Searchable select / autocomplete'],
        ['Owner', 'User select dropdown'],
        ['Tags', 'Multi-select chip input'],
        ['Notes', 'Textarea'],
      ],
      [3000, 6500]
    ),

    h2('5.4 Deals — Kanban Pipeline'),
    body('Route: /deals', { bold: true }),
    body('Layout: Horizontal scrollable Kanban board. Each column is 280 px fixed width.'),
    h4('Column Header'),
    bullet('Stage name (uppercase), deal count, total value'),
    h4('Stage Colours'),
    styledTable(
      ['Stage', 'Colour'],
      [
        ['Lead', '#94A3B8 (grey-blue)'],
        ['Qualified', '#3B82F6 (blue)'],
        ['Proposal', '#8B5CF6 (purple)'],
        ['Negotiation', '#F59E0B (amber)'],
        ['Closed Won', '#10B981 (green)'],
        ['Closed Lost', '#EF4444 (red) — cards muted, opacity 0.6'],
      ],
      [2500, 7000]
    ),
    h4('Deal Card'),
    bullet('White background, --shadow-sm, --radius-md'),
    bullet('Title (bold, truncate after 2 lines)'),
    bullet('Contact name + small avatar'),
    bullet('Value ($X,XXX) — right aligned'),
    bullet('Close date — red if overdue, calendar icon'),
    bullet('Drag handle icon (top-right, visible on hover)'),
    bullet('Click → opens Deal edit form as a drawer'),
    h4('Deal Form (Side Drawer)'),
    bullet('Slides in from right, 400 px wide'),
    bullet('Fields: Title*, Value, Stage (select), Close Date, Contact (autocomplete), Owner, Notes'),

    h2('5.5 Activities'),
    body('Route: /activities', { bold: true }),
    h4('Filter Bar'),
    bullet('Type (All / Call / Email / Meeting / Note) | Contact (search select) | Date range'),
    h4('Activity Feed Card'),
    bullet('Coloured icon circle (phone=blue, email=purple, calendar=green, note=grey)'),
    bullet('Subject (bold), notes excerpt (2 lines), linked contact/deal chip'),
    bullet('Author avatar + name, formatted date/time'),
    bullet('Hover: Edit | Delete icons appear'),
    h4('Log Activity Drawer'),
    bullet('Type selector (icon tabs: Call / Email / Meeting / Note)'),
    bullet('Subject*, Notes (rich textarea), Contact link, Deal link, Date/time'),

    h2('5.6 Tasks'),
    body('Route: /tasks', { bold: true }),
    h4('Filter Tabs'),
    bullet('All | My Tasks | Overdue | Due Today | Upcoming | Completed'),
    h4('Task Row'),
    bullet('Checkbox | Title | Contact/Deal chip | Assignee avatar | Due date chip | Actions'),
    bullet('Completed: strikethrough title, muted row'),
    bullet('Overdue: due date chip red (--color-danger)'),
    bullet('Due today: due date chip orange (--color-warning)'),
    h4('Task Form (modal or drawer)'),
    bullet('Title*, Description, Due Date (date picker), Assignee, Link to Contact, Link to Deal'),

    h2('5.7 Users (Admin Only)'),
    body('Route: /users  |  Layout: table', { bold: true }),
    styledTable(
      ['Column', 'Content'],
      [
        ['Avatar', 'Initials circle'],
        ['Name', 'Full name'],
        ['Email', 'Email address'],
        ['Role', 'Badge: ADMIN (indigo) / USER (grey)'],
        ['Status', 'Active (green dot) / Inactive (grey dot)'],
        ['Joined', 'Date joined'],
        ['Actions', 'Edit role / Deactivate'],
      ],
      [2500, 7000]
    ),

    h2('5.8 Tags (Admin Only)'),
    body('Route: /tags  |  Layout: simple list with colour swatches', { bold: true }),
    bullet('Each row: colour circle swatch | tag name | contact count | delete icon'),
    bullet('"New Tag" button opens inline input (name + colour picker)'),

    pageBreak(),
    h1('6. Reusable Components'),

    h2('6.1 Button Variants'),
    styledTable(
      ['Variant', 'Visual'],
      [
        ['Primary', 'Filled --color-primary, white text, --radius-md'],
        ['Secondary', 'White background, --color-border border, dark text'],
        ['Danger', 'Filled --color-danger, white text'],
        ['Ghost', 'Transparent, --color-text-secondary, no border'],
        ['Icon', '32×32 px circle, single icon, ghost hover'],
      ],
      [2000, 7500]
    ),

    h2('6.2 Input Fields'),
    bullet('Label: above input, --font-size-sm, --color-text-secondary'),
    bullet('Input height: 40 px, --radius-md border, 1 px --color-border'),
    bullet('Focus ring: 2 px --color-primary outline'),
    bullet('Error state: red border + red helper text below'),
    bullet('Disabled: --color-background fill, --color-text-disabled text'),

    h2('6.3 Tag / Status Chips'),
    bullet('Coloured pill: custom background, white text, --radius-full, --font-size-xs'),
    bullet('Stage badge: same pattern with stage-specific colours'),

    h2('6.4 Avatar'),
    bullet('Circle with initials from first + last name'),
    bullet('Background: deterministic colour from name hash (10 preset colours)'),
    bullet('Sizes: 24 px (inline), 32 px (table row), 48 px (card), 80 px (detail page)'),

    h2('6.5 Toast Notifications'),
    bullet('Appear top-right, slide-in animation, auto-dismiss after 4 seconds'),
    bullet('Types: Success (green left border), Error (red left border), Info (blue left border)'),
    bullet('Max 3 visible at once; oldest dismissed on overflow'),

    h2('6.6 Confirm Dialog'),
    bullet('Modal overlay with backdrop blur'),
    bullet('Title, descriptive message, Cancel (secondary) + Confirm (danger) buttons'),
    bullet('--shadow-lg, --radius-lg, max-width 400 px'),

    h2('6.7 Empty States'),
    bullet('Line-art SVG illustration + heading + subtext + CTA button'),
    bullet('Vertically centred within content area for each main list view'),

    h2('6.8 Skeleton Loaders'),
    bullet('Grey bar placeholders matching content shape (70% + 40% widths alternating)'),
    bullet('Animated shimmer gradient (left → right, 1.5 s loop)'),

    h2('6.9 Search / Autocomplete Input'),
    bullet('Magnifier icon prefix, Clear (×) icon suffix when value is set'),
    bullet('Dropdown: max 8 results visible, scrollable'),
    bullet('Loading spinner while fetching; "No results" empty state'),

    pageBreak(),
    h1('7. Navigation & Information Architecture'),
    styledTable(
      ['Route', 'Screen', 'Access'],
      [
        ['/login', 'Login page', 'Unauthenticated only'],
        ['/ (dashboard)', 'Dashboard summary', 'All users'],
        ['/contacts', 'Contact list', 'All users'],
        ['/contacts/new', 'Create contact', 'All users'],
        ['/contacts/:id', 'Contact detail', 'All users'],
        ['/contacts/:id/edit', 'Edit contact', 'All users'],
        ['/deals', 'Kanban pipeline', 'All users'],
        ['/deals/new', 'Create deal (drawer)', 'All users'],
        ['/deals/:id/edit', 'Edit deal (drawer)', 'All users'],
        ['/activities', 'Global activity feed', 'All users'],
        ['/tasks', 'Task list', 'All users'],
        ['/users', 'User management', 'ADMIN only'],
        ['/tags', 'Tag management', 'ADMIN only'],
        ['/profile', 'Current user profile', 'All users'],
      ],
      [3000, 3000, 3500]
    ),

    pageBreak(),
    h1('8. Key Interaction Patterns'),

    h2('8.1 Drawers vs. Full Pages'),
    body('Use drawers (right-slide panel, 400 px wide) for: creating/editing a Deal, logging an Activity, creating/editing a Task, creating a Tag. Drawers overlay content without full navigation; close with × or click outside.'),
    body('Use full pages for: Contact create/edit (complex form), Contact detail view.'),

    h2('8.2 Optimistic UI'),
    body('Apply immediately in the UI before server confirms: Task complete toggle, Deal stage change (Kanban drag). Revert on server error with a toast.'),

    h2('8.3 Inline Editing'),
    body('Contact detail: Name and title fields can be clicked to enter inline edit mode. Other fields use the full edit form.'),

    h2('8.4 Drag and Drop (Kanban)'),
    bullet('Grab handle appears on card hover'),
    bullet('Card lifts (shadow increases, slight scale 1.02) while dragging'),
    bullet('Target column highlights with a dashed border'),
    bullet('Cards in target column shift down to show drop position'),

    pageBreak(),
    h1('9. Accessibility'),
    bullet('All interactive elements keyboard navigable (Tab, Enter/Space)'),
    bullet('Focus rings always visible (2 px outline) — never hidden without alternative'),
    bullet('Colour contrast ≥ 4.5:1 for all text'),
    bullet('All icons have aria-label or adjacent visible text'),
    bullet('Form inputs have associated <label> elements'),
    bullet('Modal traps focus until dismissed'),
    bullet('Status messages announced via ARIA live regions'),

    h1('10. Animation & Motion'),
    styledTable(
      ['Element', 'Animation'],
      [
        ['Page transition', 'Fade-in 150 ms'],
        ['Drawer open/close', 'Slide from right 250 ms ease-out'],
        ['Modal open', 'Scale from 0.95 + fade-in 200 ms'],
        ['Toast notification', 'Slide down from top 200 ms'],
        ['Kanban card drag', 'Scale 1.02 + shadow increase'],
        ['Checkbox toggle', 'Checkmark draw 150 ms'],
        ['Skeleton loader', 'Shimmer left-to-right 1.5 s loop'],
      ],
      [3500, 6000]
    ),
    body('All animations must honour prefers-reduced-motion — skip or reduce transitions when the system preference is set.', { italic: true }),

    pageBreak(),
    h1('11. File / Asset Handoff Checklist (for stitch.ai)'),
    body('The following should be produced in the design output:'),
    bullet('Component library with all states (default, hover, focus, disabled, error)'),
    bullet('All 8 screens at desktop resolution (1440 px width):'),
    bullet('Login', 1),
    bullet('Dashboard', 1),
    bullet('Contact List', 1),
    bullet('Contact Detail', 1),
    bullet('Contact Form', 1),
    bullet('Deal Board (Kanban)', 1),
    bullet('Task List', 1),
    bullet('Activity Feed', 1),
    bullet('Drawer designs: Deal form, Activity form, Task form'),
    bullet('Modal designs: Confirm dialog'),
    bullet('Empty state illustrations for each main list view'),
    bullet('Toast notification examples (success, error)'),
    bullet('Design token export (colours, typography, spacing) as CSS variables or JSON'),
    bullet('Icon set reference (Material Icons or Heroicons recommended)'),
  ];

  return new Document({
    styles: docStyles,
    sections: [{ properties: pageProps.properties, children }],
  });
}

// ─── Write files ──────────────────────────────────────────────────────────────

async function main() {
  const outDir = path.resolve(__dirname, '..');

  const reqBuffer = await Packer.toBuffer(buildRequirementsDoc());
  const desBuffer = await Packer.toBuffer(buildDesignDoc());

  fs.writeFileSync(path.join(outDir, 'CRM_Requirements.docx'), reqBuffer);
  fs.writeFileSync(path.join(outDir, 'CRM_Design.docx'), desBuffer);

  console.log('Done: CRM_Requirements.docx and CRM_Design.docx created in', outDir);
}

main().catch(console.error);
