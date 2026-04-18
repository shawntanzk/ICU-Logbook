# ICU Logbook

A cross-platform mobile app for ICU trainees and supervisors to log clinical cases, track procedure competency, and monitor progress across the CoBaTrICE framework — fully offline, with a clear path to cloud sync and AI features.

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [Who Is It For?](#2-who-is-it-for)
3. [Features](#3-features)
4. [Screenshots — Screen by Screen](#4-screenshots--screen-by-screen)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [Installation](#7-installation)
8. [Running the App](#8-running-the-app)
9. [Using the App](#9-using-the-app)
10. [Data & Privacy](#10-data--privacy)
11. [Architecture Decisions](#11-architecture-decisions)
12. [Extending the App](#12-extending-the-app)
13. [Troubleshooting](#13-troubleshooting)
14. [Glossary](#14-glossary)

---

## 1. What Is This App?

ICU Logbook is a mobile application that replaces paper-based clinical logbooks used by doctors training in Intensive Care Medicine.

Trainees log each case they manage and each procedure they perform. The app automatically maps these to the **CoBaTrICE framework** — a European standard for ICU competency — giving trainees and supervisors a real-time view of progress across 12 clinical domains.

All data is stored **on the device** first (offline-first). A sync button uploads records to a backend when connectivity is available. The app is designed as a pilot prototype ready for real user testing.

---

## 2. Who Is It For?

| Role | What they do in the app |
|---|---|
| **Trainee** (ICU registrar / fellow) | Logs cases and procedures, tracks their own competency, writes reflections |
| **Supervisor** (Consultant ICU physician) | Views trainee records in read-only mode, reviews progress |

---

## 3. Features

### Implemented in this MVP

- **Login screen** — name + role selection (Trainee or Supervisor). No password in demo mode.
- **Case Log** — full form with date, diagnosis, ICD-10 code, organ systems, CoBaTrICE domains, supervision level, and reflection notes.
- **Procedure Log** — procedure type, attempts, success/fail outcome, complications, optional link to a case.
- **Dashboard** — stat cards (total cases, this month, procedures, success rate), competency dot grid, domain coverage bars, recent cases.
- **Competency Heatmap** — 3×4 grid of all 12 CoBaTrICE domains, colour-coded by case count (grey → light blue → medium blue → primary blue).
- **Case List** — searchable, filterable list of all cases. Tap any case to view full details.
- **Case Detail** — full case view with linked procedures, sync status, AI summary button, and delete (trainees only).
- **AI Summary** (mock) — generates a context-aware plain-English summary of any case from its data fields. Ready to connect to a real AI API.
- **Sync** — sync button in Settings shows real pending count, uploads to a mock Supabase client, marks records synced, shows last sync time.
- **Supervisor mode** — read-only; Add Case screen is locked, delete buttons hidden, supervisor banner displayed.
- **Offline-first** — all data saved locally to SQLite before any network call.

### Not yet implemented (see [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md))

- Real authentication (passwords, JWT tokens)
- Real cloud backend
- PDF/CSV export
- Push notifications
- Date picker UI
- Edit existing cases

---

## 4. Screenshots — Screen by Screen

> The app uses a bottom tab bar with five tabs: **Dashboard**, **Cases**, **Add Case**, **Procedures**, and **Settings**.

### Login Screen
The first screen on launch. Enter your name, select whether you are a Trainee or Supervisor, and tap **Continue**. No password is required in demo mode.

### Dashboard
Shows four stat cards at the top (Total Cases, This Month, Procedures, Success Rate). Below is a blue banner that opens the **Competency Map**. Further down are domain coverage bars and a list of the five most recent cases. Pending-sync cases are labelled "Pending sync" in amber.

### Competency Map
A 3-column grid of all 12 CoBaTrICE domains. Each cell shows:
- The number of cases that covered that domain
- A text label: Not started / Developing / Progressing / Proficient
- A colour from light grey (0 cases) to deep blue (6+ cases)

A legend at the bottom explains the colour scale.

### Case Log (Add Case)
A scrollable form. Fields:
1. **Date** — type in YYYY-MM-DD format (e.g. `2026-04-17`)
2. **Primary Diagnosis** — free text
3. **ICD-10 Code** — autocomplete. Start typing a diagnosis (e.g. *sepsis*) or a code (e.g. *A41*); the dropdown shows matches as `Diagnosis [CODE]`. Pick one and the human-readable label stays in the field, but only the bare code (e.g. `A41.9`) is written to the database — keeping the data compact and interoperable with external coding systems.
4. **Organ Systems** — tap chips to multi-select (Respiratory, Cardiovascular, etc.)
5. **CoBaTrICE Domains** — tap chips to multi-select (12 domains)
6. **Supervision Level** — radio buttons: Observed / Supervised / Unsupervised
7. **Reflection** — free text, multi-line

Tap **Save Case**. Validation errors appear inline. A success alert confirms the save.

### Case List
All logged cases, newest first. A search bar filters by diagnosis, ICD-10 code, or date. Each row shows:
- Date
- Diagnosis
- Number of domains and systems covered
- A coloured supervision badge (OBS / SUP / UNS)

Pull down to refresh.

### Case Detail
Full case view. Includes:
- **AI Clinical Summary** button (purple, top of screen) — generates a plain-English summary from the case data
- All case fields displayed in labelled sections
- Chip lists for organ systems and domains
- Linked procedures (if any were logged against this case)
- Sync status and logged timestamp at the bottom
- Delete button (trainees only)

### Procedures
Lists all procedures, newest first. Each row shows a coloured left border (green = success, red = fail), procedure type, date, attempt count, and a Success / Fail badge. Tap the + button or "Log Procedure" to add one.

### Add Procedure Form
- **Procedure Type** — tap a chip from the list of 16 ICU procedures
- **Number of Attempts** — numeric input
- **Outcome** — toggle switch (Successful / Unsuccessful)
- **Complications** — free text, optional
- **Link to Case** — horizontal scrollable row of recent cases (optional)

### Settings
Shows:
- Your name and role, with a Synced / Pending / Syncing pill
- **Sync Now** button — uploads all unsynced records to the (mock) Supabase backend, shows result
- Last synced timestamp
- Data summary (case count, procedure count)
- Export and Clear Data (placeholders, coming in a future release)
- Sign Out button

---

## 5. Tech Stack

| Technology | What it does | Why we chose it |
|---|---|---|
| **React Native** | Renders native iOS and Android UI from one codebase | Write once, run on both platforms |
| **Expo** | Build tooling, device APIs, over-the-air updates | Fastest path to a working app without native setup |
| **TypeScript** | Adds static types to JavaScript | Catches bugs before they reach users |
| **expo-sqlite** | Local database on the device | Fast, offline, no internet required |
| **Zustand** | App-wide state management | Simple, lightweight, no boilerplate |
| **Zod** | Form and data validation | Validates user input with clear error messages |
| **React Navigation** | Screen routing and tab bar | The standard navigation library for React Native |
| **dayjs** | Date formatting and calculation | Tiny, fast, simple API |
| **Supabase** (mock) | Cloud database and auth | The planned backend — currently mocked for local testing |

---

## 6. Project Structure

```
ICU-Logbook/
├── App.tsx                      ← Entry point. Initialises DB, renders navigator.
├── app.json                     ← Expo project config (name, icons, plugins)
├── package.json                 ← Dependencies list
├── tsconfig.json                ← TypeScript compiler settings
├── babel.config.js              ← JavaScript transpiler settings
│
└── src/
    ├── models/                  ← Data shape definitions + validation rules
    │   ├── CaseLog.ts           ← CaseLog type and Zod schema
    │   └── ProcedureLog.ts      ← ProcedureLog type and Zod schema
    │
    ├── database/                ← Local SQLite layer
    │   ├── client.ts            ← Opens the database, singleton connection
    │   └── migrations.ts        ← Creates and upgrades database tables
    │
    ├── services/                ← All data operations (no UI logic here)
    │   ├── DataService.ts       ← Shared interfaces (IDataService, ISyncService)
    │   ├── CaseService.ts       ← CRUD + queries for cases
    │   ├── ProcedureService.ts  ← CRUD + queries for procedures
    │   ├── SyncService.ts       ← Uploads unsynced records to Supabase
    │   └── supabase.ts          ← Mock Supabase client (swap for real later)
    │
    ├── store/                   ← Reactive state (what screens read and write)
    │   ├── authStore.ts         ← Login state, user name, role
    │   ├── caseStore.ts         ← Case list, domain counts, month count
    │   ├── procedureStore.ts    ← Procedure list, success rate, type counts
    │   └── syncStore.ts         ← Sync in-progress state, last sync time
    │
    ├── components/              ← Reusable UI building blocks
    │   ├── Button.tsx           ← Primary / secondary / danger / ghost buttons
    │   ├── Card.tsx             ← White rounded card container
    │   ├── DomainBar.tsx        ← Horizontal progress bar for each domain
    │   ├── EmptyState.tsx       ← Icon + text for empty lists
    │   ├── FormField.tsx        ← Labelled text input with error display
    │   ├── MultiSelect.tsx      ← Toggleable chip grid for multi-select
    │   ├── RadioGroup.tsx       ← Radio button list with descriptions
    │   └── StatCard.tsx         ← Dashboard stat tile (icon + number + label)
    │
    ├── screens/                 ← One file per screen
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── CompetencyScreen.tsx
    │   ├── CaseListScreen.tsx
    │   ├── CaseDetailScreen.tsx
    │   ├── AddCaseScreen.tsx
    │   ├── ProcedureListScreen.tsx
    │   ├── AddProcedureScreen.tsx
    │   └── SettingsScreen.tsx
    │
    ├── navigation/              ← Screen routing
    │   ├── types.ts             ← TypeScript types for all navigation routes
    │   └── RootNavigator.tsx    ← Full navigator tree (auth gate + tabs + stacks)
    │
    └── utils/                   ← Small helper functions
        ├── constants.ts         ← Colours, spacing, CoBaTrICE domains, organ systems
        ├── dateUtils.ts         ← Date formatting with dayjs
        └── uuid.ts              ← UUID v4 generator for local record IDs
```

---

## 7. Installation

> **You will need a computer (Mac, Windows, or Linux) with internet access.**
> These steps work even if you have never written code before.

### Step 1 — Install Node.js

Node.js is the JavaScript runtime the app needs to build.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the green button)
3. Run the installer and follow the prompts
4. To verify it worked, open **Terminal** (Mac/Linux) or **Command Prompt** (Windows) and type:
   ```
   node --version
   ```
   You should see something like `v20.x.x`.

### Step 2 — Install the Expo CLI

Expo is the tool that builds and runs the app.

In your Terminal / Command Prompt, run:
```bash
npm install -g expo-cli
```

### Step 3 — Download the project

If you received this as a ZIP file, unzip it to a folder of your choice.

If you are using Git:
```bash
git clone https://github.com/your-org/ICU-Logbook.git
cd ICU-Logbook
```

### Step 4 — Install dependencies

Navigate to the project folder in Terminal and run:
```bash
npm install
```

This downloads all the libraries the app needs. It may take 1–3 minutes.

### Step 5 — Install Expo Go on your phone (optional, for physical device)

If you want to run the app on your own phone:
- iPhone: search **Expo Go** in the App Store
- Android: search **Expo Go** in the Play Store

---

## 8. Running the App

From the project folder, run:
```bash
npx expo start
```

A QR code and menu will appear in the terminal.

| What you want | What to do |
|---|---|
| Run on your **iPhone or Android phone** | Open Expo Go, tap "Scan QR code", scan the code in the terminal |
| Run on **iOS Simulator** (Mac only, requires Xcode) | Press `i` in the terminal |
| Run on **Android Emulator** (requires Android Studio) | Press `a` in the terminal |
| Run in a **web browser** (limited functionality) | Press `w` in the terminal |

> **Tip:** The app hot-reloads. Every time you save a file, the app updates on your device automatically.

### First launch

On the very first launch, the app creates the local database. You will see a brief "Initialising…" screen, then the Login screen.

---

## 9. Using the App

### Logging in

1. Enter your name (e.g. "Dr Smith")
2. Tap **Trainee** or **Supervisor**
3. Tap **Continue**

No password is required. This is a demo — see [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for how to add real authentication.

### Logging a case (Trainees only)

1. Tap the **Add Case** tab (the ＋ icon in the bottom bar)
2. Fill in the date in `YYYY-MM-DD` format (e.g. `2026-04-17`)
3. Enter the primary diagnosis
4. Optionally enter the ICD-10 code
5. Tap one or more **organ systems** (they highlight in blue when selected)
6. Tap one or more **CoBaTrICE domains**
7. Select a supervision level
8. Optionally write a reflection
9. Tap **Save Case**

The case appears immediately in the **Cases** tab and updates the Dashboard.

### Logging a procedure

1. Tap the **Procedures** tab
2. Tap **Log Procedure** (or the floating + button)
3. Tap a procedure type chip
4. Enter number of attempts
5. Toggle the outcome switch
6. Optionally add complications text
7. Optionally link to one of your recent cases
8. Tap **Save Procedure**

### Viewing competency progress

1. On the **Dashboard**, tap the blue **Competency Map** banner
2. The grid shows all 12 CoBaTrICE domains coloured by how many cases you have logged against each

### Syncing data

1. Go to the **Settings** tab
2. The pill next to your name shows **Synced**, **X Pending**, or **Syncing…**
3. Tap **Sync Now** to upload all pending records
4. An alert confirms how many records were synced

> In this demo, sync uses a mock Supabase client. No data leaves the device. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for real sync setup.

### Supervisor mode

If you logged in as a **Supervisor**:
- You can view all cases and procedures in read-only mode
- The **Add Case** tab shows a locked screen
- Case detail screens show a "Supervisor View" banner and hide the Delete button
- Your role is shown in the Settings user card

### Signing out

1. Go to **Settings**
2. Scroll to the bottom
3. Tap **Sign Out**

---

## 10. Data & Privacy

- All data is stored **only on the device** in a local SQLite database file called `icu_logbook.db`
- No data is sent anywhere unless you tap **Sync Now**
- In this demo, the sync target is a mock client — no real server receives any data
- Deleting the app removes all local data permanently

> For clinical deployment, refer to [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for data governance, encryption, and HIPAA/GDPR compliance requirements.

---

## 11. Architecture Decisions

These decisions are recorded so future developers understand the reasoning.

### Why SQLite instead of WatermelonDB?

WatermelonDB offers reactive queries and better performance at scale, but adds significant setup complexity (native modules, schemas with decorators, migration overhead). For a pilot with tens to hundreds of records, `expo-sqlite` with manual SQL is simpler, faster to build, and easier to audit. The service layer abstraction (`IDataService` interface in `DataService.ts`) means swapping to WatermelonDB later does not require touching any screen or store code.

### Why Zustand instead of Redux Toolkit?

Redux Toolkit is excellent for large teams and complex state graphs. Zustand provides equivalent functionality for this app's scope in roughly 1/5 the code, with no providers, no boilerplate, and full TypeScript support. Both use the same mental model (stores, actions, selectors) so migrating to Redux later is straightforward if needed.

### Why is business logic in services, not stores or screens?

Screens should only describe what the UI looks like. Stores should only hold and update state. All SQL queries and data transformations live in the service layer (`CaseService`, `ProcedureService`). This means any screen can be rewritten without touching the data layer, and the data layer can be tested independently.

### Why is the Supabase client a mock in a separate file?

The mock (`src/services/supabase.ts`) has exactly the same method signatures as the real Supabase JS client. When you are ready to go live, you replace only this one file — every other file that imports it continues to work unchanged.

### Why is each database migration in a separate version entry?

Migrations run exactly once per version number. If you add a new migration entry with version `2`, devices currently on version `1` will automatically apply it on next launch. Devices that installed fresh will run both. You never need to edit previous entries, which prevents hard-to-debug inconsistencies between devices.

### Why is `synced` a boolean field on every record?

This is the simplest possible offline-sync pattern (sometimes called "sync flag"). Every write sets `synced = false`. Every successful upload sets `synced = true`. The sync service only uploads `synced = false` records. This works reliably for a single-user, single-device scenario. It is intentionally simple — see the production roadmap for multi-device conflict resolution.

---

## 12. Extending the App

### Adding a real Supabase backend

See [SETUP.md](SETUP.md) for step-by-step instructions including the SQL schema, environment variables, and how to replace the mock client.

### Adding real authentication

1. Install `@supabase/supabase-js`
2. Create `src/services/AuthService.ts`
3. Replace the demo login in `LoginScreen.tsx` with Supabase Auth email/password
4. The `authStore.ts` shape stays the same — just populate it from the Supabase session

### Adding AI summaries

The AI Summary button in `CaseDetailScreen.tsx` (function `handleAISummary`) currently generates a template string. To connect to the Claude API:

1. Create `src/services/AIService.ts`
2. Call `https://api.anthropic.com/v1/messages` with the case data as context
3. Replace the `Alert.alert(...)` in `handleAISummary` with the API response

### Extending the ICD-10 list

The autocomplete is backed by a curated list in `src/data/icd10.ts` — roughly 130 ICU-relevant codes covering sepsis, respiratory failure, MI/arrest, stroke, AKI, DKA, trauma, poisoning and similar presentations. To add a code, append a new entry to the `ICD10_CODES` array:

```ts
{ code: 'J96.90', label: 'Respiratory failure, unspecified' },
```

No other wiring is needed — the autocomplete, search ranking, and `findByCode` helper all read from this array.

**Why a curated list instead of the full 70,000-code dataset?** Three reasons:

1. **UX.** An intensivist logging a case after a 12-hour shift wants 5–10 plausible suggestions, not a scroll of sub-specialty orthopaedic fracture codes. Curation keeps the signal-to-noise ratio high and reduces miscoding.
2. **Bundle size.** The full ICD-10-CM code set is several megabytes of JSON. Shipping it inside the app bundle slows cold start and wastes memory on devices that only need a few hundred codes. A curated list stays under 10 KB.
3. **Offline-first.** Because the list is a plain TypeScript module, it's available instantly with no network call, no lazy load, and no failure mode. Loading the full WHO dataset would push us toward a server-side lookup or a lazy chunk — both add complexity that doesn't pay off for this use case.

If your unit needs broader coverage (e.g. for billing or audit feeds), the right pattern is to keep the curated list for suggestions and call an external ICD-10 service for validation at sync time — don't bloat the client bundle.

### Adding new CoBaTrICE domains or organ systems

Edit `src/utils/constants.ts`. Add new entries to `COBATRICE_DOMAINS` or `ORGAN_SYSTEMS`. The MultiSelect components, dashboard bars, and competency map all read from these arrays automatically.

### Adding a new screen

1. Create `src/screens/YourScreen.tsx`
2. Add it to the appropriate stack or tab in `src/navigation/RootNavigator.tsx`
3. Add its param type to `src/navigation/types.ts`

### Adding a new database column

1. Open `src/database/migrations.ts`
2. Add a new entry with `version: N` (next number)
3. Write the `ALTER TABLE` SQL
4. Update the corresponding service file to read/write the new column
5. Update the TypeScript model in `src/models/`

---

## 13. Troubleshooting

### "npm install" fails

- Make sure Node.js is installed: run `node --version`
- Try deleting the `node_modules` folder and running `npm install` again
- On Mac, you may need to run `sudo npm install` if you get permission errors

### The app shows "Initialising…" and never loads

This usually means the database failed to open. Check that:
- Your device has available storage
- You are not running the app in a restricted sandbox environment

### The QR code does not work

- Make sure your phone and computer are on the same Wi-Fi network
- Try pressing `s` in the terminal to switch to "Expo Go" mode
- Try running `npx expo start --tunnel` instead

### Changes I make to the code are not appearing

- The app hot-reloads, but sometimes you need to reload manually
- Shake your device and tap **Reload**, or press `r` in the terminal

### The app crashes on startup after adding new code

- Check the terminal output for red error messages
- TypeScript errors will be shown there
- The most common cause is a missing import

### I cannot see my logged cases

- Cases are stored locally on the device. If you reinstalled the app, data was deleted.
- Make sure you are signed in with the same name/role (auth is not linked to storage in the demo).

---

## 14. Glossary

| Term | Meaning |
|---|---|
| **CoBaTrICE** | Competency Based Training in Intensive Care Medicine for Europe — a 12-domain competency framework for ICU training |
| **ICD-10** | International Classification of Diseases, 10th revision — a standard code system for medical diagnoses (e.g. A41.9 = Sepsis, unspecified) |
| **Organ system** | A body system involved in a patient's illness (e.g. Respiratory, Cardiovascular) |
| **Supervision level** | How closely a trainer oversaw the trainee during a case: Observed (consultant present), Supervised (available nearby), Unsupervised (retrospective review) |
| **Offline-first** | Data is saved locally before any network call, so the app works without internet |
| **SQLite** | A file-based database stored directly on the device — no server required |
| **Supabase** | An open-source cloud database and authentication service — the planned backend |
| **Zustand** | A lightweight state management library for React apps |
| **Zod** | A TypeScript validation library used to check form inputs |
| **Expo** | A platform that makes it easier to build React Native apps |
| **React Native** | A framework for building mobile apps using JavaScript and React |
| **TypeScript** | A typed version of JavaScript that catches errors before the app runs |
| **Migration** | A versioned script that updates the database structure without losing existing data |
| **Sync flag** | A boolean field (`synced`) that tracks whether a record has been uploaded to the cloud |
| **MVP** | Minimum Viable Product — the simplest version of the app that delivers core value |
