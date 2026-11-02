# Freelancer Work Manager PWA — Design Spec

Date: 2026-11-02
Status: Approved in conversation; pending written-spec review

## 1. Purpose

A self-hosted, installable, offline-first web app for a single freelancer to run their work end to end: clients and projects, tasks and deadlines, time tracking, expenses, invoicing with tax and partial payments, reminders, and reports.

**Success looks like:** from a phone, log a work session in seconds; see what is due this week at a glance; turn a month of tracked hours and expenses into a correct, taxed PDF invoice in about two minutes; never lose data when offline.

**Users:** one person (the owner). No team, no client portal.

**Look & feel:** modern, distinctive, animated — not a generic admin template. Smooth, purposeful motion (page transitions, list reordering, timer, drag-and-drop), light and dark themes, mobile-first.

## 2. Architecture

```
Phone / Laptop browser
 └─ React PWA (Vite, installable, service worker caches the app shell)
     ├─ Local DB (IndexedDB via Dexie) — all reads/writes go here first
     └─ Sync engine ⇄ PocketBase REST + realtime (self-hosted, HTTPS)
                         └─ SQLite + file storage (logo, receipts, attachments)
 Server (Docker Compose): caddy · pocketbase · notifier · backup
```

- The UI never waits on the network.
- All IDs are generated on the client (15-char PocketBase-compatible IDs), so offline creates never collide.

### Tech stack
React 18 + TypeScript + Vite · vite-plugin-pwa (Workbox) · Dexie · TanStack Router · Tailwind CSS · Framer Motion (animation) · dnd-kit (drag and drop) · FullCalendar (MIT core + daygrid/timegrid/list/interaction plugins, themed to match) · SheetJS (xlsx/csv) · pdfmake (PDF) · Zod (validation) · PocketBase JS SDK · Vitest + Playwright.

Server: PocketBase (pinned version) · Node notifier (`web-push`, `node-cron`, PocketBase SDK) · Caddy 2 · a backup container.

## 3. Data model

Every collection also has `id`, `created`, `updated`, `deleted` (bool, soft delete). Money is stored as **integer minor units** (e.g. paise/cents). Durations are stored in **minutes** (integer). Dates are ISO strings; timestamps are UTC.

### 3.1 Masters (user-editable lookup lists)

Common fields on every master row: `name`, `color`, `sort_order`, `active`, `is_default`.

| Collection | Extra fields | Used by |
|---|---|---|
| `project_statuses` | `meaning`: open \| closed | projects |
| `task_statuses` | `meaning`: open \| in_progress \| closed | tasks, board columns |
| `priorities` | `level` (int, for sorting) | tasks |
| `expense_categories` | none | expenses |
| `tags` | none | tasks, projects |
| `units` | `label` (hour/day/item) | invoice lines |
| `payment_terms` | `days` (int) | clients, invoices |
| `payment_methods` | none | payments |
| `currencies` | `code` (ISO 4217), `symbol`, `decimals` | clients, projects, expenses, invoices |
| `tax_rates` | `label` (e.g. GST/VAT); `components`: list of {`name`, `rate`} (rate in basis points; total = sum) | invoice lines, expenses |

Rules:
- A master value that is referenced cannot be hard-deleted, only deactivated. Inactive values are hidden from new-record pickers but still display on existing records.
- Records reference master values by ID, so renames propagate.
- First-run seeding creates sensible defaults (e.g. task statuses To Do / Doing / Done; priorities Low / Medium / High / Urgent; currencies INR, USD, EUR, GBP; tax rates "No tax 0%", "GST 18% (CGST 9% + SGST 9%)", "IGST 18%").
- System logic uses the status `meaning`, never names: "overdue tasks" = due before now and status meaning ≠ closed; "active projects" = status meaning = open.

### 3.2 Core collections

**settings** (single row): `business_name`, `address`, `email`, `phone`, `tax_id`, `logo` (file), `default_currency`, `default_tax_rate`, `default_payment_term`, `default_hourly_rate`, `invoice_prefix`, `invoice_next_number`, `invoice_yearly_reset` (bool), `invoice_title` ("Invoice" / "Tax Invoice"), `payment_instructions` (text), `time_rounding_minutes` (0/6/15/30), `accent_color`, `reminder_prefs` (JSON, see §6), `quiet_hours` ({start, end}), `timezone`.

**clients**: `name`, `contact_name`, `email`, `phone`, `address`, `state_region`, `tax_id` (GSTIN/VAT), `currency`, `default_hourly_rate`, `payment_term`, `notes`, `archived`.

**projects**: `client`, `name`, `status`, `billing_type` (hourly \| fixed), `hourly_rate` (optional), `fixed_price` (optional), `currency` (defaults to the client's currency; user-selectable), `start_date`, `due_date`, `budget_minutes`, `tags[]`, `color`, `notes`.

**tasks**: `project`, `title`, `notes`, `status`, `priority`, `tags[]`, `start_date` (optional), `due_date` (optional), `due_time` (optional), `estimate_minutes`, `sort_order`, `completed_at`.

**task_reminders**: `task`, `remind_at` (timestamp), `sent` (bool).

**task_attachments**: `task`, `file`, `name`, `size`, `mime`. Max 25 MB per file (configurable).

**time_entries**: `project`, `task` (optional), `start`, `end` (null while running), `duration_minutes`, `note`, `billable`, `invoice` (set when billed). At most one entry with `end = null` may exist.

**expenses**: `project` (optional), `date`, `category`, `description`, `amount`, `currency`, `tax_rate` (optional), `tax_amount`, `receipt` (file), `billable`, `markup_bp` (basis points), `invoice` (set when billed).

**invoices**: `client`, `number` (null until sent), `issue_date`, `due_date`, `currency`, `status` (draft \| sent \| void — stored), `notes`, `subtotal`, `tax_total`, `total` (stored snapshots), `snapshot` (JSON: business + client details at send time), `sent_at`, `voided_at`.

Derived (computed, never stored): `amount_paid` = sum of non-deleted payments; `balance_due` = total − amount_paid; display status = `partially_paid` when 0 < paid < total, `paid` when paid = total, `overdue` when sent, past due date, balance > 0.

**invoice_lines**: `invoice`, `sort_order`, `description`, `sac_code` (optional), `quantity` (stored as thousandths, int), `unit`, `unit_price` (minor units), `tax_rate`, `amount`, `tax_amount`, `source` (time \| expense \| manual \| fixed), `source_ids[]`.

**payments**: `invoice`, `date`, `amount`, `method`, `note`.

**saved_filters**: `name`, `scope` ("tasks"), `filter` (JSON), `columns` (JSON).

**notifications**: `type`, `title`, `body`, `link`, `read`, `created`.

**push_subscriptions**: `endpoint`, `keys` (JSON), `device_label`.

## 4. Offline & sync

- Every collection is mirrored in Dexie. Each local write also appends to an `outbox` table: {op: upsert|delete, collection, id, payload, ts}.
- Sync cycle triggers: app open, every 30 s while online, `online` event, and debounced (1 s) after any local write.
  1. **Push:** send the outbox in order, using upsert by ID (create if the record is missing, otherwise update). Remove an item from the outbox once the server acknowledges it.
  2. **Pull:** per collection, fetch records with `updated > lastPulledAt[collection]` (paged) and merge locally.
- Realtime: while online, subscribe to PocketBase realtime for all collections and merge incoming events immediately.
- **Conflict rule:** last write wins at record level, compared on `updated`. Local records with pending outbox ops are not overwritten by older server versions.
- **Invoice numbers:** assigned server-side by a PocketBase hook when status changes draft → sent (atomic counter in settings, with optional yearly reset). Offline, "Mark as sent" is queued; the UI shows "Pending number" until the push succeeds.
- **Single running timer:** starting a timer stops any other running entry locally. A server hook enforces this on write: when a new running entry arrives, it closes any other running entry at the new entry's start time.
- **Files:** stored as Blobs in Dexie until uploaded (multipart) on push; downloaded files are cached for offline viewing.
- **Sync indicator:** synced / syncing / offline (N pending) / error, with a details sheet and a Retry button.
- **Auth:** email + password once per device; the token auto-refreshes. Logout warns if the outbox is not empty, then clears local data.
- **Backups:** nightly server snapshot of `pb_data` (keep 14), plus in-app full JSON export/import.

## 5. Screens & navigation

Mobile: a bottom nav (Dashboard · Tasks · Timer · Invoices · More). Desktop: a collapsible left sidebar with the same items plus Clients, Projects, Calendar, Expenses, Reports, Masters, Settings.

- **Dashboard:** today/overdue tasks, running timer card, hours this week (chart), unpaid and overdue balances per currency, income this month per currency, quick-add (task / time / expense).
- **Clients:** list (active/archived) with search; detail page with info, projects, invoices, outstanding balance and total billed.
- **Projects:** list filtered by status, client and tags; detail page with tasks, time vs budget, expenses, unbilled amount, invoices, and "Create invoice from unbilled".
- **Tasks:**
  - **List view:** filters (client, project, status, priority, tags, due range: overdue / today / this week / custom, text search), a column picker with reordering, saved filters, and **Export → Excel / CSV / PDF** of exactly the filtered rows and selected columns. The PDF includes the logo and the active filters in its header.
  - **Board view:** kanban by task status, drag to change status and order.
  - **Task detail:** notes, dates, priority, tags, reminders, attachments (camera/upload, image/PDF preview), logged time, and a "Start timer" button.
- **Calendar:** month / week / day / agenda views showing task due dates (multi-day when a start date is set), time entries, and invoice due dates; uses the same filters as the task list; drag a task to reschedule; tap an empty slot to add a task or time entry.
- **Timer:** a large animated start/stop control with a project/task picker; today's entries; manual entry; a week view with daily totals; edit or split entries.
- **Expenses:** filterable list; add with a receipt photo; billable/billed markers.
- **Invoices:** status-filtered list; builder (client → currency, pull in unbilled time grouped per task / project / entry / single line, pull in billable expenses with markup, fixed-price or milestone %, manual lines, tax per line); preview; PDF download/share (Web Share API); record payment; payment history; Revert to draft / Void.
- **Reports:** time by client/project over a date range; income received vs invoiced per currency; receivables ageing; expenses by category; profit per project (billed − expenses).
- **Masters:** one screen with a tab per master; add/edit, drag to reorder, color, default, deactivate.
- **Settings:** business profile and logo, invoice numbering, defaults, time rounding, reminders and quiet hours, notification permission per device, theme, backup export/import, sync status, logout.
- **Global:** light/dark theme, install prompt, command-palette search (Ctrl/⌘+K) across clients, projects, tasks and invoices, an undo toast after deletes, and Zod-validated forms (e.g. end ≥ start, payment ≤ balance).

### Visual & motion direction
- **Look:** a distinct identity rather than a stock dashboard: a bold display typeface paired with a clean UI sans, a warm off-white / deep ink palette with one vivid accent (user-configurable), soft layered surfaces, generous radius, subtle grain or gradient mesh on hero surfaces.
- **Motion (Framer Motion):** shared-layout transitions between list and detail, spring-animated list reorder, kanban drag physics, a timer ring animation, number tickers on dashboard stats, staggered entrances.
- **Reduced motion:** all motion respects `prefers-reduced-motion`.

## 6. Notifications & reminders

- **In-app notification center** (bell icon): works offline, and the client also generates due reminders locally on open.
- **Web Push** via the **notifier** service (Node, runs every minute): reads due items from PocketBase, sends push with VAPID, writes `notifications` rows, and marks `task_reminders.sent`. On iOS, push requires the PWA to be installed to the Home Screen (iOS 16.4+).

| Reminder | Default |
|---|---|
| Task due | 1 day before, plus at `due_time` if set |
| Task overdue | 09:00 the day after the due date |
| Custom task reminder | at each `task_reminders.remind_at` |
| Invoice due soon / overdue | 3 days before / 1 day after |
| Timer left running | after 4 h |
| Daily digest | 09:00: today's tasks, overdue items, unpaid invoices |

- Each reminder type can be toggled and its timing adjusted in `settings.reminder_prefs`.
- During quiet hours, push is deferred until the quiet period ends.
- Deduplication key: (type, record id, scheduled time).

## 7. Invoicing & tax rules

- **Hourly lines:** quantity = hours after rounding to `time_rounding_minutes` (applied per line group). Rate precedence: project rate → client default rate → settings default.
- **Fixed price:** a line for the full price or a milestone percentage; the project shows invoiced vs remaining.
- **Expenses:** amount × (1 + markup). If the expense currency differs from the invoice currency, the user enters the billed amount in the invoice currency.
- **Discounts:** entered as a negative manual line (this also reduces tax).
- **Currency:** an invoice has exactly one currency. Only time and expenses from projects in that currency can be pulled in automatically.
- **Calculation:**
  - Line `amount` = round(quantity × unit_price).
  - Tax per component per line = round(amount × component rate); line `tax_amount` = sum of its components.
  - Prices are exclusive of tax.
  - Totals are sums of line values.
  - The tax summary is grouped by component (e.g. CGST 9%, SGST 9%).
  - Rounding is half-up to the currency's minor unit.
- **Lifecycle:**
  - **Draft:** editable. Deleting a draft releases linked time and expenses.
  - **Send:** the server assigns the number, the lines lock, and the business + client snapshot is stored.
  - **Revert to draft:** keeps the number.
  - **Void:** keeps the record and releases linked items.
- **Payments:** sum ≤ total is enforced; status is derived. No credit notes and no recurring invoices.
- **PDF (pdfmake, client-side):** logo, business details and tax ID, invoice title, client snapshot and GSTIN/VAT, number and dates, lines (with SAC code), tax summary by component, totals, paid, balance due, payment instructions, notes, optional amount in words, accent color.

## 8. Deployment & security

- **Docker Compose services:**
  - `caddy`: auto HTTPS; serves the built PWA; proxies `/api` and `/_` to PocketBase. The admin path is restricted by IP allowlist.
  - `pocketbase`: volume `pb_data`; migrations in `pb_migrations`; hooks in `pb_hooks`.
  - `notifier`
  - `backup`: nightly tar of `pb_data`, keeps 14, optional rclone off-site.
- **Configuration:** a `.env` file holds DOMAIN, ADMIN_EMAIL, VAPID keys and PB credentials for the notifier. `scripts/setup.sh` generates the VAPID keys, creates the superuser and the single app user, and seeds masters.
- **Access:**
  - Public sign-up is disabled.
  - Every collection rule is `@request.auth.id != ""` (single owner).
  - Login is rate-limited.
  - Optional TOTP MFA.
  - Files are protected (file tokens).
- **Updates:** `git pull && docker compose up -d --build`; migrations apply on start.
- **Local development:** `docker compose -f docker-compose.dev.yml up` (PocketBase only) plus `npm run dev`.

## 9. Testing

- **Unit (Vitest):** money and tax calculation, rounding, time rounding, rate precedence, invoice totals and derived status, sync merge / conflict rules, the outbox, filter → export row selection, reminder scheduling.
- **Integration:** the sync engine against a real PocketBase container: offline edits, two clients, deletes, invoice numbering, single running timer.
- **End-to-end (Playwright):** client → project → task → timer → invoice → PDF → payment; filtered task export; offline then online; masters deactivation.

## 10. Build phases

Each phase is deployable and usable.

1. **Foundation:** repo and Docker stack, PocketBase schema and migrations, auth, Dexie + sync engine, app shell with design system and motion, Masters, Settings, Clients, Projects.
2. **Tasks:** list + board, filters, saved filters, export (xlsx / csv / pdf), attachments, reminders data, calendar.
3. **Time:** timer, manual entries, week view, time on the calendar.
4. **Money:** expenses with receipts, invoice builder, tax components, PDF, payments.
5. **Notifications:** notifier service, Web Push, notification center, digest, quiet hours.
6. **Insights:** dashboard, reports, global search, JSON backup/import.

## 11. Out of scope

Multiple users or teams, client portal, emailing invoices from the server, online payment collection, credit notes, recurring invoices, estimates/quotes, exchange-rate conversion, automatic GST place-of-supply detection, task comments.
