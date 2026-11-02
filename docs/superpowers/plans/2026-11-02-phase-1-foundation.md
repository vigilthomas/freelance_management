# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable, installable, offline-first PWA with login, a working sync engine, a distinctive animated app shell, and fully working Masters, Settings, Clients and Projects screens.

**Architecture:** A React + TypeScript PWA reads and writes a local Dexie (IndexedDB) database. Every write also lands in an outbox, which a sync engine pushes to a self-hosted PocketBase and then pulls back (plus realtime). Production runs with Docker Compose (Caddy serving the PWA and proxying PocketBase).

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Tailwind CSS 3, Framer Motion 11, dnd-kit, TanStack Router 1 (code-based routes), Dexie 4 + dexie-react-hooks, Zod 3, pocketbase JS SDK, vite-plugin-pwa, Vitest + fake-indexeddb + Testing Library, Playwright, PocketBase server (JSVM API ≥ 0.23), Caddy 2.

**Spec:** `docs/superpowers/specs/2026-11-02-freelancer-pwa-design.md` (§2, §3.1, §3.2 settings/clients/projects, §4, §5 shell/Masters/Settings/Clients/Projects, §8, §9). Later phases (Tasks, Time, Money, Notifications, Insights) each get their own plan.

## Global Constraints

- Layout: frontend in `app/`, PocketBase in `server/`, compose files, `Caddyfile` and `.env.example` at repo root, scripts in `scripts/`.
- App name constant: `APP_NAME = "Forge"` in `app/src/config.ts`. This is the only place the name lives; it is used in the manifest, title and login screen.
- IDs: 15 chars of `[a-z0-9]`, generated on the client (PocketBase-compatible).
- Money: integer minor units everywhere. Rates are in basis points (`1800` = 18%). Durations are integer minutes.
- Every synced record has `id`, `updated_at` (client epoch ms, number), `deleted` (bool). PocketBase's own `created`/`updated` autodate fields are server-only; `updated` is the pull cursor.
- References between records are **plain text ID fields**, not PocketBase relation fields (outbox order cannot be guaranteed against FK checks during realtime merges). The client enforces integrity.
- Settings is a single row with fixed id `settings0000000`.
- Every PocketBase collection rule (list/view/create/update/delete) is `@request.auth.id != ""`. The built-in `users` collection has create disabled (`createRule = null`).
- PocketBase version is pinned in `server/Dockerfile` to the latest stable release at Task 3 time and recorded in `server/PB_VERSION`.
- Backups use PocketBase's built-in scheduled backups (cron `0 3 * * *`, keep 14), set in a migration. This replaces the spec's separate backup container and gives the same result.
- Fonts are self-hosted via `@fontsource-variable/bricolage-grotesque` (display) and `@fontsource-variable/inter` (UI), so the app works offline.
- Palette tokens. Light: `--paper #F6F3EE`, `--surface #FFFFFF`, `--ink #15171C`, `--muted #6B6F7A`, `--line #E4DFD6`. Dark: `--paper #0F1115`, `--surface #181B21`, `--ink #F2EFE9`, `--muted #8B90A0`, `--line #2A2E37`. `--accent` defaults to `#FF5A36` and is overridden by `settings.accent_color`.
- All motion goes through `<MotionConfig reducedMotion="user">`.
- UI tasks (Task 7 onward) load the `frontend` and `anthropic-skills:genjutsu` skills before writing components.

## Review Focus

1. **Offline write, then reload before sync:** the outbox persists in IndexedDB and is pushed on the next open. Pinned in Task 4 (`outbox survives db reopen`).
2. **Remote update arrives while a local edit is pending:** the newer `updated_at` wins, and a pending local edit is never replaced by an older or equal remote. Pinned in Task 5 (`mergeDecision` cases).
3. **Auth token expired (401) mid-sync:** status becomes `error` with `authExpired: true`, the outbox is untouched, and the UI offers "Sign in again". Pinned in Task 5 (`401 keeps outbox`).
4. **Money typed as "1,250.50", or into a 0-decimal currency (JPY):** parses to the correct minor units; garbage or negative input is rejected by forms. Pinned in Task 2 (`toMinor` cases) and Task 10 (client form rejects `-5`).
5. **A deactivated master value still referenced by an old record:** the record still shows the name, and the value is absent from pickers. Pinned in Task 8 (`MasterSelect hides inactive but shows current`).

---

### Task 1: Frontend scaffold & tooling

**Files:**
- Create: `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/tailwind.config.ts`, `app/postcss.config.js`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/config.ts`, `app/src/test/setup.ts`, `.gitignore`
- Test: `app/src/App.test.tsx`

**Interfaces:**
- Produces: `npm --prefix app run dev | build | test | lint | e2e`; `APP_NAME` from `app/src/config.ts`; a Vitest jsdom environment with `fake-indexeddb/auto` imported in `src/test/setup.ts`; a Vite dev proxy from `/api` and `/_` to `http://127.0.0.1:8090`.

- [ ] **Step 1:** Scaffold with `npm create vite@latest app -- --template react-ts`. Install the stack listed in the header and dev dependencies (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `fake-indexeddb`, `@playwright/test`, `eslint`). Enable `"strict": true`.
- [ ] **Step 2: Write the failing test** `App.test.tsx`: `render(<App />)` and `expect(screen.getByText(APP_NAME)).toBeInTheDocument()`.
- [ ] **Step 3:** Run `npm --prefix app test -- --run`. Expected: FAIL (App does not render the name).
- [ ] **Step 4:** Make `App` render `APP_NAME`. Configure Tailwind content globs and the Vitest `environment: 'jsdom'` and `setupFiles`.
- [ ] **Step 5:** Run `npm --prefix app test -- --run && npm --prefix app run build`. Expected: PASS, and the build succeeds.
- [ ] **Step 6: Commit** `chore: scaffold frontend app`.

### Task 2: Core utilities — ids, money, dates

**Files:**
- Create: `app/src/lib/ids.ts`, `app/src/lib/money.ts`, `app/src/lib/dates.ts`
- Test: `app/src/lib/ids.test.ts`, `app/src/lib/money.test.ts`

**Interfaces:**
- Produces:
  - `newId(): string`
  - `toMinor(input: string | number, decimals: number): number | null` (null when invalid)
  - `fromMinor(minor: number, decimals: number): string` (plain, e.g. `"1250.50"`)
  - `formatMoney(minor: number, cur: { code: string; decimals: number }, locale?: string): string`
  - `roundHalfUp(x: number): number`
  - `applyBp(minor: number, bp: number): number` (= `roundHalfUp(minor * bp / 10000)`)
  - `nowMs(): number`, `todayISO(): string` (YYYY-MM-DD, local)

- [ ] **Step 1: Write failing tests:**
  - `newId()` matches `/^[a-z0-9]{15}$/`, and 1000 calls are unique.
  - `toMinor("1,250.50",2) === 125050`
  - `toMinor("1250.5",2) === 125050`
  - `toMinor(12,2) === 1200`
  - `toMinor("1500",0) === 1500`
  - `toMinor("abc",2) === null`
  - `toMinor("-5",2) === -500` (negatives are allowed at util level for discount lines; forms reject them)
  - `toMinor("1.005",2) === 101` (half-up)
  - `fromMinor(125050,2) === "1250.50"`
  - `applyBp(10000,1800) === 1800`
  - `applyBp(3333,1800) === 600`
  - `formatMoney(125050,{code:'INR',decimals:2},'en-IN')` contains `"1,250.50"`
- [ ] **Step 2:** Run `npm --prefix app test -- --run src/lib`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `newId`: `crypto.getRandomValues` mapped onto the 36-char alphabet.
  - `toMinor`: strip commas and spaces, validate with `/^-?\d+(\.\d+)?$/`, and do decimal-string arithmetic. Never use `parseFloat × 10^d` (float error).
  - `formatMoney`: `Intl.NumberFormat(locale, {style:'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals})`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add id, money and date utilities`.

### Task 3: PocketBase server — schema, rules, hooks, dev runtime

**Files:**
- Create: `server/Dockerfile`, `server/PB_VERSION`, `server/pb_migrations/1730500000_init.js`, `server/pb_migrations/1730500001_seed.js`, `server/pb_hooks/lww.pb.js`, `docker-compose.dev.yml`, `scripts/dev-user.sh`
- Test: `server/test/smoke.sh`

**Interfaces:**
- Produces collections (all base type, all with `updated_at` number, `deleted` bool, autodate `created`/`updated`):
  - `settings`: fields per spec §3.2. `logo` is a file field, max 1, 5 MB. `reminder_prefs` and `quiet_hours` are JSON.
  - Masters: `project_statuses`, `task_statuses`, `priorities`, `expense_categories`, `tags`, `units`, `payment_terms`, `payment_methods`, `currencies`, `tax_rates`. Common fields `name, color, sort_order, active, is_default`, plus the extras from spec §3.1. `tax_rates.components` is JSON `[{name, rate}]` with rate in bp.
  - `clients`, `projects`: fields per spec §3.2. `tags` is JSON (array of ids).
- Produces hook behaviour: on record update, if the incoming `updated_at` < the stored `updated_at`, respond `409 {"code":"stale"}`.
- Produces seeds:
  - task statuses To Do (open), Doing (in_progress), Done (closed)
  - project statuses Lead (open), Active (open), On hold (open), Done (closed)
  - priorities Low 1, Medium 2, High 3, Urgent 4
  - currencies INR ₹ 2, USD $ 2, EUR € 2, GBP £ 2, with INR the default
  - tax rates "No tax" `[]`, "GST 18%" `[{CGST,900},{SGST,900}]`, "IGST 18%" `[{IGST,1800}]`
  - units Hour, Day, Item
  - payment terms Due on receipt 0, Net 7, Net 15 (default), Net 30
  - payment methods Bank transfer, UPI, PayPal, Cash
  - expense categories Software, Hardware, Travel, Office, Other
  - settings row `settings0000000` with defaults: `invoice_prefix "INV-"`, `invoice_next_number 1`, `invoice_title "Invoice"`, `time_rounding_minutes 0`, `accent_color "#FF5A36"`, `timezone "Asia/Kolkata"`
  - backups cron `0 3 * * *`, `cronMaxKeep 14`
  - `users.createRule = null`

  Every seeded row has `updated_at` = migration time and `deleted false`.
- Produces a dev runtime: `docker compose -f docker-compose.dev.yml up -d` serves PocketBase on `127.0.0.1:8090`, with migrations and hooks mounted. `scripts/dev-user.sh <email> <password>` creates the superuser and the app user.

- [ ] **Step 1: Write the failing smoke test** `server/test/smoke.sh`:
  - auth as the dev user via `POST /api/collections/users/auth-with-password`
  - `GET /api/collections/task_statuses/records` returns 3 items
  - an unauthenticated `GET` of `clients` returns 0 items or 403
  - create a client with `updated_at=2000`, then PATCH with `updated_at=1000`, expecting HTTP 409
  - `POST /api/collections/users/records` unauthenticated returns 403/400

  The script exits non-zero on any mismatch.
- [ ] **Step 2:** Run `bash server/test/smoke.sh`. Expected: FAIL (no server).
- [ ] **Step 3:** Write the Dockerfile: alpine, download `pocketbase_${PB_VERSION}_linux_amd64.zip`, copy `pb_migrations` and `pb_hooks`, `CMD serve --http=0.0.0.0:8090`.
- [ ] **Step 4:** Write the migrations and the hook using the ≥0.23 JSVM API (`new Collection({...})`, `app.save()`, `onRecordUpdateRequest`). Then write the compose dev file and the user script.
- [ ] **Step 5:** Run `docker compose -f docker-compose.dev.yml up -d --build && bash scripts/dev-user.sh dev@forge.test devpassword123 && bash server/test/smoke.sh`. Expected: `ALL OK`.
- [ ] **Step 6: Commit** `feat(server): pocketbase schema, seeds, rules and LWW hook`.

### Task 4: Local database, repository and outbox

**Files:**
- Create: `app/src/data/schema.ts`, `app/src/data/db.ts`, `app/src/data/repo.ts`, `app/src/data/hooks.ts`
- Test: `app/src/data/repo.test.ts`

**Interfaces:**
- Consumes: `newId`, `nowMs` (Task 2).
- Produces:
  - `schema.ts`:
    - `type CollectionName` = union of all Task 3 collections; `SYNCED_COLLECTIONS: CollectionName[]`
    - `interface BaseRecord { id: string; updated_at: number; deleted: boolean }`
    - `interface MasterRecord extends BaseRecord { name: string; color: string; sort_order: number; active: boolean; is_default: boolean; meaning?: 'open'|'in_progress'|'closed'; level?: number; label?: string; days?: number; code?: string; symbol?: string; decimals?: number; components?: { name: string; rate: number }[] }`
    - `Settings`, `Client`, `Project` interfaces mirroring the spec fields (money in minor units, `tags: string[]`)
    - `MASTER_KINDS` (the 10 master collection names, `as const`), `type MasterKind = typeof MASTER_KINDS[number]`
  - `db.ts`: `class ForgeDB extends Dexie` with a table per collection (index `id, updated_at, deleted`, plus `client` on projects and `sort_order` on masters), `outbox` (`++seq, [collection+id]`), `meta` (key-value); exported `db`; `resetDb(): Promise<void>`.
  - `repo.ts`:
    - `put<T extends BaseRecord>(c: CollectionName, data: Partial<T>, files?: Record<string, Blob | null>): Promise<T>`. Merges with the existing row, sets `id` if missing, `updated_at = nowMs()`, `deleted ??= false`, writes the row and an outbox entry in **one Dexie transaction**, and removes older outbox entries for the same `[collection+id]` (coalesce, carrying forward un-pushed files).
    - `softDelete(c, id)`, `restore(c, id)`, `get<T>(c, id)`, `pendingCount(): Promise<number>`
    - `interface OutboxEntry { seq?: number; collection: CollectionName; id: string; payload: BaseRecord; files?: Record<string, Blob | null> }`
  - `hooks.ts`:
    - `useRows<T>(c, opts?: { includeDeleted?: boolean; sortBy?: keyof T }): T[] | undefined` (live; excludes deleted by default)
    - `useRow<T>(c, id): T | undefined`
    - `usePendingCount(): number`

- [ ] **Step 1: Write failing tests:**
  - `put assigns id, updated_at and outbox entry`
  - `second put of same record coalesces to one outbox entry with latest payload`
  - `softDelete sets deleted and enqueues`
  - `outbox survives db reopen` (put, `db.close()`, `db.open()`, `pendingCount() === 1`)
  - `put merges partial update with existing fields`
- [ ] **Step 2:** Run `npm --prefix app test -- --run src/data`. Expected: FAIL.
- [ ] **Step 3:** Implement `schema.ts`, `db.ts`, `repo.ts` and `hooks.ts` as specified.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: local Dexie store with outbox`.

### Task 5: Sync engine

**Files:**
- Create: `app/src/sync/transport.ts`, `app/src/sync/merge.ts`, `app/src/sync/engine.ts`, `app/src/sync/status.ts`, `app/src/auth/pb.ts`
- Test: `app/src/sync/merge.test.ts`, `app/src/sync/engine.test.ts`, `app/src/sync/engine.int.test.ts`

**Interfaces:**
- Consumes: `db`, `OutboxEntry`, `SYNCED_COLLECTIONS` (Task 4).
- Produces:
  - `pb.ts`: `pb: PocketBase` (base URL `import.meta.env.VITE_PB_URL ?? window.location.origin`, `autoCancellation(false)`).
  - `transport.ts`:
    - `interface Transport { upsert(e: OutboxEntry): Promise<'ok' | 'stale'>; pull(c: CollectionName, since: string, page: number): Promise<{ items: (BaseRecord & { updated: string })[]; totalPages: number }>; subscribe(c: CollectionName, cb: (r: BaseRecord & { updated: string }) => void): Promise<() => void> }`
    - `createPbTransport(pb): Transport`. `upsert` tries `update(id)` and on 404 calls `create({id, ...})`, using `FormData` when `files` is present (a null value clears the file). 409 maps to `'stale'`; 401/403 throws `AuthExpiredError`. `pull` uses filter `updated >= "{since}"`, sort `updated`, perPage 200.
  - `merge.ts`: `mergeDecision(local: BaseRecord | undefined, remote: BaseRecord, hasPending: boolean): 'apply' | 'skip'`. Apply iff `!local`, or `remote.updated_at > local.updated_at`, or (`remote.updated_at === local.updated_at && !hasPending`).
  - `engine.ts`:
    - `syncOnce(t: Transport): Promise<void>`. Push the outbox in `seq` order, deleting each entry on `'ok'` or `'stale'`. Then pull each collection since `meta['cursor:'+c]` (default `"1970-01-01 00:00:00.000Z"`), apply `mergeDecision`, and advance the cursor to the max `updated` seen.
    - `startSync(t: Transport): () => void`. Triggers: immediately, every 30 s, on the `online` event, and 1 s debounced after `db.outbox` changes. Starts realtime subscriptions. Wraps each run in `navigator.locks.request('forge-sync')` when available.
  - `status.ts`: `type SyncState = { state: 'synced' | 'syncing' | 'offline' | 'error'; pending: number; lastSyncedAt?: number; error?: string; authExpired?: boolean }` and `useSyncStatus(): SyncState` (a tiny store via `useSyncExternalStore`).

- [ ] **Step 1: Write failing tests:**
  - `merge.test.ts`: the 5 decision cases: no local → apply; newer remote → apply; older remote → skip; equal and pending → skip; equal and none pending → apply.
  - `engine.test.ts` with an in-memory fake `Transport`:
    - `pushes outbox in order then clears it`
    - `stale response drops entry and pull restores server version`
    - `pull advances cursor and is idempotent on re-run`
    - `401 keeps outbox`: the fake throws `AuthExpiredError`; outbox length unchanged; status `error` with `authExpired: true`
    - `offline (fetch TypeError) sets state offline and keeps outbox`
- [ ] **Step 2:** Run `npm --prefix app test -- --run src/sync`. Expected: FAIL.
- [ ] **Step 3:** Implement `merge.ts`, `engine.ts`, `status.ts`, `transport.ts` and `pb.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Write the integration test** `engine.int.test.ts`, skipped unless `PB_URL` is set. Two separate `ForgeDB` instances (devices A and B) against the dev server:
  - A creates a client and syncs; B syncs and sees it.
  - B renames it (newer) and A edits the same record offline with an older `updated_at`; after both sync, both hold B's name.
  - A soft-deletes; B syncs and sees `deleted: true`.
- [ ] **Step 6:** Run `PB_URL=http://127.0.0.1:8090 npm --prefix app test -- --run src/sync/engine.int`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: offline sync engine with LWW and realtime`.

### Task 6: Auth

**Files:**
- Create: `app/src/auth/AuthProvider.tsx`, `app/src/auth/LoginPage.tsx`, `app/src/auth/logout.ts`
- Test: `app/src/auth/logout.test.ts`, `app/src/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `pb`, `startSync`, `createPbTransport`, `resetDb`, `pendingCount`.
- Produces:
  - `useAuth(): { user: { id: string; email: string } | null; login(email: string, password: string): Promise<void>; logout(opts?: { force?: boolean }): Promise<'done' | 'pending'> }`
  - `<AuthProvider>`: starts sync when the user is set and stops it on logout. It calls `pb.collection('users').authRefresh()` on start when online and, if that returns 401, marks `authExpired` rather than wiping data.
  - `logout` returns `'pending'` without clearing when `pendingCount() > 0` and `!force`. Otherwise it calls `pb.authStore.clear()` and `resetDb()`.

- [ ] **Step 1: Write failing tests:**
  - `logout returns pending when outbox non-empty`
  - `logout force clears db and auth`
  - `LoginPage shows error message on bad credentials` (mock `login` rejects, so the text "Wrong email or password" appears)
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the provider, the logout function, and the login page (email, password, submit; the motion polish happens in Task 7).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: single-user auth`.

### Task 7: Design system, app shell, routing, PWA

Load the `frontend` and `anthropic-skills:genjutsu` skills first. The goal is a distinctive, non-template look per spec §5 "Visual & motion direction".

**Files:**
- Create:
  - `app/src/ui/tokens.css`, `app/src/ui/theme.tsx`, `app/src/ui/motion.ts`
  - `app/src/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `Field.tsx`, `Sheet.tsx`, `Dialog.tsx`, `Toast.tsx`, `EmptyState.tsx`, `Badge.tsx`, `ColorSwatch.tsx`
  - `app/src/shell/AppShell.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `SyncIndicator.tsx`, `PageHeader.tsx`
  - `app/src/router.tsx`
  - `app/public/icons/*` (192, 512, maskable)
- Modify: `app/vite.config.ts` (add VitePWA), `app/src/main.tsx`
- Test: `app/src/shell/SyncIndicator.test.tsx`, `app/src/ui/Toast.test.tsx`

**Interfaces:**
- Consumes: `useSyncStatus`, `useAuth`, `useRow('settings','settings0000000')`.
- Produces:
  - `ThemeProvider` / `useTheme(): { mode: 'light' | 'dark' | 'system'; setMode(m): void }` (stored in `localStorage` key `forge-theme`, wrapped in try/catch). It sets `--accent` from settings.
  - `motion.ts` exports `spring`, `pageVariants`, `listVariants`, `itemVariants`.
  - `useToast(): { show(msg: string, opts?: { action?: { label: string; onClick(): void }; ms?: number }): void }`
  - UI primitives with props `{ label?, error?, ...native }`.
  - Routes: `/login`, `/` (dashboard placeholder for later phases), `/clients`, `/clients/$id`, `/projects`, `/projects/$id`, `/masters`, `/masters/$kind`, `/settings`. An auth guard redirects to `/login`.
  - The shell: a desktop sidebar (≥ 1024px, collapsible) and a mobile bottom nav (Dashboard, Clients, Projects, Masters, Settings for this phase). Animated page transitions use `AnimatePresence` keyed on the pathname.
  - PWA: manifest `name: APP_NAME`, `display: standalone`, `theme_color` from the accent, `registerType: 'autoUpdate'`, the app shell precached, `/api` excluded from caching.

- [ ] **Step 1: Write failing tests:**
  - `SyncIndicator shows "3 pending" when offline with pending 3`
  - `SyncIndicator shows "Sign in again" button when authExpired`
  - `Toast action button invokes callback`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the tokens (Global Constraints palette, display font on headings), the primitives, the theme, the shell, the router and the PWA config. Restyle `LoginPage` with an animated gradient-mesh hero.
- [ ] **Step 4:** Run `npm --prefix app test -- --run && npm --prefix app run build`. Expected: PASS, and the build emits `sw.js` and `manifest.webmanifest`.
- [ ] **Step 5:** Manual check: `npm --prefix app run dev`, log in, and confirm navigation animates, dark mode toggles, and the mobile width (375px) shows the bottom nav with no horizontal scroll.
- [ ] **Step 6: Commit** `feat: design system, animated shell and PWA`.

### Task 8: Masters module

**Files:**
- Create: `app/src/features/masters/MastersPage.tsx`, `MasterList.tsx`, `MasterForm.tsx`, `TaxComponentsEditor.tsx`, `MasterSelect.tsx`, `references.ts`, `actions.ts`, `config.ts`
- Test: `app/src/features/masters/actions.test.ts`, `app/src/features/masters/MasterSelect.test.tsx`

**Interfaces:**
- Consumes: `put`, `useRows`, the UI primitives, dnd-kit.
- Produces:
  - `config.ts`: `MASTER_CONFIG: Record<MasterKind, { title: string; extraFields: ('meaning' | 'level' | 'label' | 'days' | 'code' | 'symbol' | 'decimals' | 'components')[]; meaningOptions?: string[] }>`
  - `references.ts`: `MASTER_REFERENCES: Record<MasterKind, { collection: CollectionName; field: string; array?: boolean }[]>`. For Phase 1: currencies → clients.currency, projects.currency, settings.default_currency; payment_terms → clients.payment_term, settings.default_payment_term; tax_rates → settings.default_tax_rate; project_statuses → projects.status; tags → projects.tags (array). Later phases append entries.
  - `actions.ts`:
    - `isMasterInUse(kind, id): Promise<boolean>`
    - `setDefault(kind, id): Promise<void>` (unsets the others)
    - `reorder(kind, orderedIds: string[]): Promise<void>` (`sort_order = index * 10`)
    - `removeMaster(kind, id): Promise<'deleted' | 'in_use'>` (soft-deletes only when unused)
  - `<MasterSelect kind value onChange label? />`: lists active values sorted by `sort_order` with color dots, and **also** includes the current value when it is inactive, labelled "(inactive)".

- [ ] **Step 1: Write failing tests:**
  - `isMasterInUse true when a project references the status`
  - `removeMaster returns in_use and leaves row untouched`
  - `setDefault leaves exactly one default`
  - `reorder writes sort_order 0,10,20`
  - `MasterSelect hides inactive but shows current`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The page has a tab per kind (horizontally scrollable on mobile) and a sortable list with spring reorder animation. Forms open in a `Sheet`. Delete shows "In use — deactivate instead" when `in_use`. Tax rate components are entered as percent and stored in bp.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: dynamic masters module`.

### Task 9: Settings screen

**Files:**
- Create: `app/src/features/settings/SettingsPage.tsx`, `app/src/features/settings/schema.ts`, `app/src/features/settings/BackupSection.tsx` (placeholder: a "coming in Phase 6" note only)
- Test: `app/src/features/settings/schema.test.ts`

**Interfaces:**
- Consumes: `put('settings', …, { logo })`, `MasterSelect`, `useTheme`, `useAuth().logout`, `useSyncStatus`.
- Produces:
  - `settingsSchema` (Zod): `business_name` min 1; `invoice_prefix` max 12; `invoice_next_number` int ≥ 1; `time_rounding_minutes` in [0, 6, 15, 30]; `accent_color` matches `/^#[0-9a-f]{6}$/i`; `default_hourly_rate` minor units ≥ 0.
  - Sections: Business profile (with logo upload preview), Invoicing defaults, Time rounding, Appearance (theme, accent picker with live preview), Sync (status, retry, pending count), Account (logout with the pending warning dialog, then force).

- [ ] **Step 1: Write failing tests:**
  - `rejects accent "red"`
  - `rejects invoice_next_number 0`
  - `rejects time_rounding 10`
  - `accepts seeded defaults`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the schema and page. Save on submit with a success toast.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: settings screen`.

### Task 10: Clients

**Files:**
- Create: `app/src/features/clients/ClientsPage.tsx`, `ClientDetailPage.tsx`, `ClientForm.tsx`, `schema.ts`, `MoneyInput.tsx` (in `app/src/ui/`)
- Test: `app/src/features/clients/schema.test.ts`, `app/src/ui/MoneyInput.test.tsx`

**Interfaces:**
- Consumes: `put`, `softDelete`, `restore`, `useRows`, `MasterSelect`, `toMinor`, `fromMinor`, `formatMoney`, `useToast`.
- Produces:
  - `clientSchema` (Zod): `name` min 1; `email` optional valid; `currency` required id; `default_hourly_rate` int ≥ 0 (minor); `payment_term` optional id.
  - `<MoneyInput value: number | null; decimals: number; onChange(minor: number | null) />`: shows `fromMinor` and parses with `toMinor`; negative input gives the error "Must be 0 or more".
  - Pages:
    - list: search by name/email, Active/Archived segmented toggle, staggered animated cards with outstanding "—" until Phase 4
    - detail: info card, edit sheet, projects list (from `useRows('projects')` filtered by client), archive/unarchive, delete with an undo toast (`restore`)

- [ ] **Step 1: Write failing tests:**
  - `clientSchema rejects empty name`
  - `client form rejects -5 rate` (`MoneyInput` shows "Must be 0 or more" and calls `onChange(null)`)
  - `MoneyInput parses "1,250.50" to 125050`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: clients module`.

### Task 11: Projects

**Files:**
- Create: `app/src/features/projects/ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `ProjectForm.tsx`, `schema.ts`, `TagPicker.tsx` (in `app/src/ui/`)
- Test: `app/src/features/projects/schema.test.ts`, `app/src/features/projects/ProjectForm.test.tsx`

**Interfaces:**
- Consumes: `MasterSelect`, `MoneyInput`, `put`, `useRows`, `useRow`.
- Produces:
  - `projectSchema` (Zod): `client` required; `name` min 1; `status` required; `billing_type` in hourly/fixed; `fixed_price` required int > 0 when fixed; `hourly_rate` optional int ≥ 0; `currency` required; `due_date` ≥ `start_date` when both are set; `budget_minutes` optional int ≥ 0.
  - Form behaviour: selecting a client sets `currency` to the client's currency **only if the user has not changed currency manually**; currency stays selectable.
  - `<TagPicker value: string[] onChange />`: multi-select from the `tags` master with a "create tag" inline action.
  - Pages:
    - list: filter by status, client and tags; group-by-status toggle; layout-animated filtering
    - detail: header with status badge and color, info, budget bar (time arrives in Phase 3), and placeholders for tasks, time and invoices that link to later phases

- [ ] **Step 1: Write failing tests:**
  - `fixed billing requires fixed_price`
  - `due before start rejected`
  - `selecting client defaults currency`
  - `manual currency not overwritten on client change`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: projects module`.

### Task 12: Production deployment

**Files:**
- Create: `docker-compose.yml`, `Caddyfile`, `app/Dockerfile` (multi-stage: node build → `caddy:2-alpine` with `/srv/app`), `.env.example`, `scripts/setup.sh`, `docs/DEPLOY.md`

**Interfaces:**
- Produces:
  - `.env` keys: `DOMAIN`, `ADMIN_EMAIL`, `ADMIN_IPS` (space-separated CIDRs), `APP_USER_EMAIL`.
  - Caddy:
    - `{$DOMAIN}` with `/api/*` and `/_/*` proxied to `pocketbase:8090`
    - `/_/*` limited to `remote_ip {$ADMIN_IPS}`, else 403
    - SPA fallback `try_files {path} /index.html`
    - `Cache-Control: no-cache` on `sw.js` and `index.html`
  - Volumes: `pb_data`, `caddy_data`.
  - `setup.sh`: copies `.env.example` to `.env` if missing (then exits asking the user to edit it), runs `docker compose up -d --build`, prompts for passwords, runs `superuser upsert`, and creates the app user via the API with the superuser token.

- [ ] **Step 1:** Write the files.
- [ ] **Step 2:** Verify with `DOMAIN=localhost docker compose config` (expected: valid YAML, no errors). Then run `DOMAIN=localhost docker compose up -d --build`, then `curl -k https://localhost/api/health` (expected: `"code":200`). Then `curl -k https://localhost/` (expected: HTML containing `Forge`).
- [ ] **Step 3:** Write `docs/DEPLOY.md`:
  - DNS A record and server requirements
  - `scripts/setup.sh`
  - update command
  - where backups live (`pb_data/backups`) and how to restore
  - optional S3 off-site backups via the PocketBase settings
- [ ] **Step 4: Commit** `feat: production docker stack and deploy guide`.

### Task 13: End-to-end verification

**Files:**
- Create: `app/playwright.config.ts`, `app/e2e/foundation.spec.ts`

**Interfaces:**
- Consumes: the dev server plus the dev PocketBase with user `dev@forge.test` / `devpassword123` (Task 3).

- [ ] **Step 1: Write the e2e tests:**
  - `login → create client (INR) → create project for it → project shows ₹ currency`
  - `masters: deactivate "Lead" status → not offered in new project form; existing project still shows "Lead (inactive)"`
  - `offline: context.setOffline(true) → create client → indicator shows "1 pending" → setOffline(false) → indicator shows synced; reload → client still present`
  - `mobile viewport 375px: bottom nav visible, no horizontal scroll (document.scrollingElement.scrollWidth <= 375)`
- [ ] **Step 2:** Run `npm --prefix app run e2e`. Expected: 4 passed.
- [ ] **Step 3:** Run the full suite `npm --prefix app test -- --run && npm --prefix app run lint && npm --prefix app run build`. Expected: all green.
- [ ] **Step 4: Commit** `test: phase 1 end-to-end coverage`.
