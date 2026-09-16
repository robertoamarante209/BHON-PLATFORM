# BHON Clinic Quality and Operations Design

## Goal

Deliver a dependable clinical operation workspace: every existing screen and primary action is verified, the entire dashboard has an accessible dark theme, the agenda communicates status visually, patient communication is useful and human, and the platform has controlled clinic administration and support intake.

## Scope and delivery order

The work is deliberately delivered in two independently releasable cycles.

1. **Quality and daily operation:** systematic journey audit, dashboard-wide dark-theme tokens, agenda cards, and WhatsApp message templates.
2. **Platform operations:** Owner clinic lifecycle, clinic spreadsheet patient import with review, and two-way support reports.

No external WhatsApp, spreadsheet, billing, or helpdesk provider is activated in this work. The product prepares safe in-app flows and uses the existing WhatsApp deep link only; provider credentials and outbound automation are a later integration project.

## Cycle 1 — quality and daily operation

### Journey audit

Create a repeatable QA matrix for both roles. It covers authentication, logout, sidebar navigation, overview, agenda, appointments, patients and dossiers, recovery, budgets, team, settings, Owner navigation, and responsive navigation. Each scenario records precondition, action, expected result, and automated test coverage where feasible. Defects are fixed at their source and receive a regression test.

### Dashboard-wide dark theme

The existing `ThemeContext` remains the source of truth and persists a user's choice under `bhon-clinic-theme`. A semantic token layer applies to every clinic and Owner page: page, surface, elevated surface, text, muted text, border, focus, action, success, warning, danger, and agenda states. Hard-coded white/slate backgrounds inside dashboards are replaced or locally overridden by these tokens. Text on all surfaces must meet WCAG AA contrast (4.5:1 for normal body text) and the theme toggle remains keyboard-accessible.

### Agenda

Appointments render as compact cards inside their time/professional cell. The card color represents its operational status, never the patient identity:

- Scheduled / confirmed: teal.
- Awaiting confirmation: amber.
- In service: blue.
- Completed: neutral green.
- Missed / cancelled: rose.

Each card shows patient name, time, procedure or reason, professional, and a readable status label. The same status mapping is used in light and dark themes. The layout stays usable in a narrow viewport without requiring horizontal page scrolling.

### WhatsApp copy

Templates are editable before the user opens WhatsApp. They use clinic and patient variables only when those values are present and never claim urgency, scarcity, pricing, or clinical outcomes that the clinic cannot substantiate.

Required templates:

- **Confirmation:** welcoming reminder, date/time, simple reschedule call-to-action.
- **Missed appointment:** empathetic, no blame, easy opportunity to choose a new time.
- **Budget follow-up:** contextual, value-led, invites questions and a short return conversation rather than pressure.
- **Treatment continuity:** supportive check-in and convenient next action.

The product does not send messages automatically. A team member reviews content and intentionally opens the WhatsApp conversation.

## Cycle 2 — platform operations

### Owner clinic administration

The Owner clinic list exposes an explicit **Create clinic** action and a guarded **Deactivate clinic** action. Deactivation preserves clinical records and blocks new sessions; it is reversible by an Owner. Permanent deletion is out of scope because it conflicts with record retention and auditability. Every mutation checks the existing `PLATFORM_OWNER` permission and shows a clear success or failure notice.

### Patient spreadsheet import

The clinic patient list gets an **Import patients** action. It accepts `.csv` and `.xlsx`, presents a client-side preview, maps supported columns (`name`, `phone`, `email`, `birthDate`, `document`), rejects a file with no valid name column, highlights invalid rows, and requires explicit confirmation before creating patients. Duplicate matching uses normalized phone first and email second; duplicates are shown for user review and skipped by default. The source file is not retained after parsing.

### Support reports

Clinic users can create an in-app support report with subject, category, description, severity, and optional page context. Owners see those reports in the existing Support page, can assign a status (`OPEN`, `IN_PROGRESS`, `RESOLVED`), and can leave a resolution note. The reporter sees the status and resolution in the clinic support view. This is product support tracking, not a replacement for emergency or clinical incident reporting.

## Data and authorization

All Owner mutations remain server-authorized; hiding a control is never considered authorization. Imports validate client-side for experience and server-side before persistence. Existing tenant isolation applies to patients, reports, and clinic data. No secret, `.env` file, password, or third-party access token is committed.

## Error handling

Every mutation displays a non-technical failure message with an actionable retry path. Spreadsheet errors identify the row and field. Navigation failures retain the user on the current route and do not reset session state. Unsupported files never create partial patients.

## Acceptance criteria

- Every audited primary path has a documented expected outcome and tested regression where practical.
- Light and dark dashboards use semantic colors with readable text and focus states.
- Agenda cards display status, details, and status color in both themes and at mobile widths.
- WhatsApp templates are human, editable, and require an intentional user action.
- Owner can create and deactivate/reactivate clinics without erasing records.
- Patient imports only persist rows after preview and confirmation; invalid rows and duplicates are reported.
- A clinic can open a support report and see progress; Owner can resolve it with a visible note.
- Targeted tests, full frontend suite, production build, and post-deploy smoke paths pass before release.
