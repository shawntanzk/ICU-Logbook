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
11. [FAIR Semantic Data Product](#11-fair-semantic-data-product)
12. [Architecture Decisions](#12-architecture-decisions)
13. [Extending the App](#13-extending-the-app)
14. [Troubleshooting](#14-troubleshooting)
15. [Glossary](#15-glossary)

---

## 1. What Is This App?

ICU Logbook is a mobile application that replaces paper-based clinical logbooks used by doctors training in Intensive Care Medicine.

Trainees log each case they manage and each procedure they perform. The app automatically maps these to the **CoBaTrICE framework** — a European standard for ICU competency — giving trainees and supervisors a real-time view of progress across 12 clinical domains.

All data is stored **on the device** first (offline-first). A sync button uploads records to a backend when connectivity is available. The app is designed as a pilot prototype ready for real user testing.

---

## 2. Who Is It For?

The app has two account types:

| Role | What they can do |
|---|---|
| **User** (ICU doctor / trainee / fellow / consultant) | Logs their own cases and procedures. Sees anything they own, *or* where they are listed as the supervisor / observer on someone else's record. Writes reflections, tracks their own competency. |
| **Admin** | All of the above, plus: sees every record on the mock server regardless of owner, manages user accounts (create, disable, reset password, toggle role) from the Admin Panel. |

There is no separate "supervisor" or "trainee" role — supervision and observation are recorded **per record** via user pickers, not as account-level roles. A user can supervise one case and be supervised on another without any admin configuration.

---

## 3. Features

### Implemented in this MVP

- **First-run setup** — on first launch (or after a data wipe), if the server database has zero accounts the app forces the creation of an initial **admin** account (email + display name + password) and signs them in immediately. No account is seeded in code.
- **Login screen** — email + password against the mock server DB. Sessions are backed by a server-side `sessions` table (30-day expiry) with the active token cached locally.
- **Admin Panel** (Settings → Admin Panel) — admins can create users, toggle role between `admin` and `user`, disable accounts, reset passwords, and delete users.
- **Case Log** — full form with date, diagnosis, ICD-10 code, organ systems, CoBaTrICE domains, supervision level, reflection, and **Supervised by / Observed by** user pickers that attach two other users to the record.
- **Procedure Log** — procedure type, attempts, success/fail outcome, complications, optional link to a case, plus the same **Supervised by / Observed by** pickers.
- **Owner-scoped visibility** — every record carries an `owner_id`. Users see only records they own, supervised, or observed. Admins see every record. All queries enforce this server-side via a SQL `WHERE` fragment.
- **Dashboard** — stat cards (total cases, this month, procedures, success rate, domains covered), competency dot grid, domain coverage bars, recent cases. Admins see a "Administrator · all records" subtitle and a shield badge.
- **Competency Heatmap** — 3×4 grid of all 12 CoBaTrICE domains, colour-coded by case count (grey → light blue → medium blue → primary blue).
- **Case List** — searchable, filterable list of visible cases with an **owner** badge and a "You supervised" / "You observed" pill when the record isn't yours. Tap any case to view full details.
- **Case Detail** — full case view with owner / supervisor / observer rows (resolved to display names), linked procedures, sync status, AI summary button, and a delete button shown **only to the owner**.
- **Procedure List** — same owner badge + relation pill as the case list.
- **AI Summary** (mock) — generates a context-aware plain-English summary of any case from its data fields. Ready to connect to a real AI API.
- **Sync** — sync button in Settings shows real pending count, uploads to a mock Supabase client, marks records synced, shows last sync time.
- **Offline-first** — all data saved locally to SQLite before any network call.
- **Semantic coding** — every case and procedure is silently bound to SNOMED CT, ICD-10, CoBaTrICE, and Ottawa EPA codes at save-time. The UX doesn't change; the data underneath becomes machine-readable.
- **Data-sharing consent** — four-way consent model (private / anonymous aggregate / research / commercial). **Default is commercial** (fully-anonymised, opt-out); users can downgrade at any time in Settings.
- **Standards-based export** — export all consented records as HL7 FHIR R4 Bundle, openEHR Composition, JSON-LD (semantic linked data), or a human-readable data dictionary. Accessed from Settings → Data Sharing & Export.
- **Provenance + quality metadata** — every record carries app version, schema version, locale, timezone, completeness score, and coding confidence. Consumers can audit what they're buying.
- **De-identification pipeline** — exports scrub PII patterns, shift dates to epoch-week, and redact device IDs automatically.

### Not yet implemented (see [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md))

- Real cloud backend (current auth/user store is a second SQLite file standing in for the server)
- PDF/CSV export
- Push notifications
- Date picker UI
- Edit existing cases
- Supervisor countersign / approval workflow (pickers record who supervised; there's no approval state yet)

---

## 4. Screenshots — Screen by Screen

> The app uses a bottom tab bar with five tabs: **Dashboard**, **Cases**, **Add Case**, **Procedures**, and **Settings**.

### First-Run Setup Screen
Only shown when the server database has zero accounts (fresh install, or after erasing app data). Enter an email, display name, and password (min 6 chars), confirm the password, and tap **Create Admin & Sign In**. The form refuses to run if any user already exists, so it can't be used to bypass the Admin Panel.

### Login Screen
Shown on every subsequent launch while signed out. Enter your email + password and tap **Sign In**. Wrong credentials show inline errors from the auth service ("No account with that email.", "Incorrect password.", "This account has been disabled."). Sessions are 30-day server-side tokens cached locally; closing the app keeps you signed in.

### Dashboard
Header greets the signed-in user by display name. Admins see "Administrator · all records" underneath and a shield **Admin** badge; regular users see "Your clinical progress". Four stat cards at the top (Total Cases, This Month, Procedures). A second row appears once procedures exist (Success Rate, Domains Covered). Below is a blue banner that opens the **Competency Map**. Further down are domain coverage bars and a list of the five most recent cases. Pending-sync cases are labelled "Pending sync" in amber.

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
7. **Supervised by** — user picker (modal). Defaults to "None". Selects from all other active users.
8. **Observed by** — user picker (modal). Defaults to "None". Selects from all other active users.
9. **Reflection** — free text, multi-line

Tap **Save Case**. Validation errors appear inline. A success alert confirms the save. The case is stamped with your user ID as `owner_id`, plus the two optional user IDs for supervisor/observer.

### Case List
All visible cases, newest first (bounded by owner-scoped visibility — users see own + supervised + observed; admins see all). A search bar filters by diagnosis, ICD-10 code, or date. Each row shows:
- Date
- Diagnosis
- Number of domains and systems covered
- A coloured supervision badge (OBS / SUP / UNS)
- **Owner** (display name, or "You"), plus a pill labelled *You supervised* or *You observed* when the record belongs to someone else

Pull down to refresh.

### Case Detail
Full case view. Includes:
- **AI Clinical Summary** button (purple, top of screen) — generates a plain-English summary from the case data
- All case fields displayed in labelled sections
- **Owner / Supervised by / Observed by** rows resolved to display names via the user directory
- Chip lists for organ systems and domains
- Linked procedures (if any were logged against this case)
- Sync status and logged timestamp at the bottom
- Delete button shown **only to the owner** of the record (admins cannot delete other users' cases from this screen)

### Procedures
Lists visible procedures, newest first (same owner + supervised + observed scope as cases). Each row shows a coloured left border (green = success, red = fail), procedure type, date, attempt count, owner name, optional "You supervised / observed" pill, and a Success / Fail badge. Tap the + button or "Log Procedure" to add one.

### Add Procedure Form
- **Procedure Type** — tap a chip from the list of 16 ICU procedures
- **Number of Attempts** — numeric input
- **Outcome** — toggle switch (Successful / Unsuccessful)
- **Complications** — free text, optional
- **Link to Case** — horizontal scrollable row of recent cases (optional)
- **Supervised by / Observed by** — user pickers, same pattern as the case form

### Settings
Shows:
- Your display name and role (User / Administrator), with a shield icon for admins
- **Sync Now** — uploads all unsynced records to the (mock) Supabase backend, shows result
- Last synced timestamp and data summary (case count, procedure count)
- **Data Sharing & Consent** → four-way consent screen
- **Export** → FHIR / openEHR / JSON-LD / data dictionary
- **Admin Panel** (admins only) — create / disable / role-toggle / password-reset / delete users
- Sign Out button

### Admin Panel (admins only)
Reachable from **Settings → Admin Panel**. Lists every account in the server DB with their role badge (Admin / User) and disabled state. Actions per row:
- Tap the role to toggle between admin and user
- Disable / re-enable (kills active sessions on disable)
- Reset password to an admin-chosen value
- Delete user
- **Create User** button — email, display name, password, role (defaults to `user`)

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
    ├── database/                ← Two SQLite files: local cache + mock server
    │   ├── client.native.ts     ← Opens icu_logbook.db (offline cache)
    │   ├── client.web.ts        ← Web stub
    │   ├── migrations.ts        ← v1→v5 local schema migrations (additive)
    │   ├── serverClient.native.ts ← Opens icu_logbook_server.db (users/sessions)
    │   ├── serverClient.web.ts  ← Web stub
    │   └── serverMigrations.ts  ← v1→v2 server schema migrations
    │
    ├── services/                ← All data operations (no UI logic here)
    │   ├── DataService.ts       ← Shared interfaces (IDataService, ISyncService)
    │   ├── CaseService.ts       ← CRUD + queries for cases
    │   ├── ProcedureService.ts  ← CRUD + queries for procedures
    │   ├── AuthService.ts       ← signIn, signOut, session restore, hasAnyUser, createFirstAdmin, user CRUD
    │   ├── AuthScope.ts         ← SQL WHERE fragments for per-user visibility
    │   ├── passwordHash.ts      ← Salt + hash helpers for the mock server
    │   ├── SyncService.ts       ← Uploads unsynced records to Supabase
    │   └── supabase.ts          ← Mock Supabase client (swap for real later)
    │
    ├── store/                   ← Reactive state (what screens read and write)
    │   ├── authStore.ts         ← Session, user, role, needsInitialSetup flag
    │   ├── caseStore.ts         ← Case list, domain counts, month count
    │   ├── procedureStore.ts    ← Procedure list, success rate, type counts
    │   ├── consentStore.ts      ← Four-way data-sharing consent
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
    │   ├── StatCard.tsx         ← Dashboard stat tile (icon + number + label)
    │   └── UserPicker.tsx       ← Modal single-select picker for a user
    │
    ├── screens/                 ← One file per screen
    │   ├── FirstRunSetupScreen.tsx   ← Initial admin creation when DB has no users
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── CompetencyScreen.tsx
    │   ├── CaseListScreen.tsx
    │   ├── CaseDetailScreen.tsx
    │   ├── AddCaseScreen.tsx
    │   ├── ProcedureListScreen.tsx
    │   ├── AddProcedureScreen.tsx
    │   ├── SettingsScreen.tsx
    │   ├── ConsentScreen.tsx
    │   ├── ExportScreen.tsx
    │   └── AdminPanelScreen.tsx
    │
    ├── navigation/              ← Screen routing
    │   ├── types.ts             ← TypeScript types for all navigation routes
    │   └── RootNavigator.tsx    ← Auth gate (Setup / Login / Main) + tabs + stacks
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

On the very first launch the app creates two SQLite databases (`icu_logbook.db` for the offline cache, `icu_logbook_server.db` as the mock remote server) and runs all migrations. Because the server DB starts empty, you'll be routed to the **First-Run Setup** screen to create the initial admin account. Fill it in, tap *Create Admin & Sign In*, and you land straight in the app.

> To reset back to first-run setup at any time, erase the simulator ("Device → Erase All Content and Settings…") or delete and reinstall Expo Go / your dev client on a physical device. Both SQLite files live inside the app sandbox, so removing the app removes all data.

---

## 9. Using the App

### First-run admin setup

The very first time the app runs (or after erasing app data), no user accounts exist. The app detects this and forces the **Setup** screen:

1. Enter an email
2. Enter a display name
3. Enter a password (minimum 6 characters) and confirm it
4. Tap **Create Admin & Sign In**

That first account is always an admin, and the setup flow refuses to run after any user exists — so it can't be used as a back-door once the Admin Panel is in use.

### Logging in

1. Enter your email and password
2. Tap **Sign In**

Sessions last 30 days and survive app restarts. If you want to switch accounts, use **Settings → Sign Out**.

### Creating additional users

Only admins can create accounts. **Settings → Admin Panel → Create User** — set email, display name, password, and role (user or admin). Users can then log in with those credentials on any device.

### Logging a case

1. Tap the **Add Case** tab (the ＋ icon in the bottom bar)
2. Fill in the date in `YYYY-MM-DD` format (e.g. `2026-04-17`)
3. Enter the primary diagnosis
4. Optionally enter the ICD-10 code
5. Tap one or more **organ systems** (they highlight in blue when selected)
6. Tap one or more **CoBaTrICE domains**
7. Select a supervision level
8. Optionally pick a **Supervised by** and / or **Observed by** user from the modal picker
9. Optionally write a reflection
10. Tap **Save Case**

The case appears immediately in the **Cases** tab — for you (as owner) and for whoever you named as supervisor / observer. It updates the Dashboard for all three.

### Logging a procedure

1. Tap the **Procedures** tab
2. Tap **Log Procedure** (or the floating + button)
3. Tap a procedure type chip
4. Enter number of attempts
5. Toggle the outcome switch
6. Optionally add complications text
7. Optionally link to one of your recent cases
8. Optionally pick **Supervised by** / **Observed by**
9. Tap **Save Procedure**

### Viewing competency progress

1. On the **Dashboard**, tap the blue **Competency Map** banner
2. The grid shows all 12 CoBaTrICE domains coloured by how many cases you have logged against each

### Syncing data

1. Go to the **Settings** tab
2. The pill next to your name shows **Synced**, **X Pending**, or **Syncing…**
3. Tap **Sync Now** to upload all pending records
4. An alert confirms how many records were synced

> In this demo, sync uses a mock Supabase client. No data leaves the device. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for real sync setup.

### Who sees what

Visibility is enforced at the SQL layer via a scoped `WHERE` fragment:

| Account | Sees |
|---|---|
| **User** | Records they own, plus records where they're named as the supervisor or observer |
| **Admin** | Every record in the server DB |

Users who didn't create a record can still view its full detail (they're a participant), but the **Delete** button on Case Detail is gated on ownership — only the owner can delete.

### Admin-only tasks

- **Settings → Admin Panel** lists every account with actions to toggle role, disable, reset password, delete, and create new users.
- Admins also see a shield **Admin** badge and an "Administrator · all records" subtitle on the Dashboard.

### Signing out

1. Go to **Settings**
2. Scroll to the bottom
3. Tap **Sign Out**

---

## 10. Data & Privacy

- All data is stored **only on the device**, in two SQLite files: `icu_logbook.db` (the offline cache of cases / procedures) and `icu_logbook_server.db` (a stand-in for the remote server — users, sessions, and the source-of-truth copy of each record). Both live inside the app sandbox (`.../Library/LocalDatabase/` on iOS).
- Passwords are salted + hashed before being written to the server DB; only session tokens are cached on the device.
- No data is sent anywhere unless you tap **Sync Now** — and in this demo the sync target is a mock client, so even that doesn't leave the device.
- Deleting the app removes both DBs permanently. On next install the app returns to the first-run setup flow because the server DB has zero accounts.
- **Data-sharing consent** is opt-out. The default is **Commercial** — because every payload is fully anonymised at the client (PII scrubbed, dates epoch-weeked, device ID redacted), there is no identifying information to protect. Users can downgrade to *Research*, *Anonymous aggregate only*, or *Private* at any time in **Settings → Data sharing consent**.
- **Exports are de-identified at the client.** Free-text fields are scrubbed for PII patterns, dates are shifted to epoch-week, and device IDs are redacted before any payload leaves the app. See [Section 11: FAIR Semantic Data Product](#11-fair-semantic-data-product).

> For clinical deployment, refer to [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for data governance, encryption, and HIPAA/GDPR compliance requirements.

---

## 11. FAIR Semantic Data Product

The ICU Logbook is designed so the data it collects is not just useful to the trainee who logged it, but also usable — long after the fact, by people who have never seen the app — as a **FAIR** (Findable, Accessible, Interoperable, Reusable) semantic data product. The goal is to be able to sell de-identified, consented records to research partners and data-product buyers worldwide, with zero re-engineering of the source data.

This section documents the architecture that makes that possible.

### 11.1 Principles

| FAIR letter | What it means here |
|---|---|
| **Findable** | Every case/procedure has a persistent IRI (`https://w3id.org/iculogbook/id/case/<uuid>`). Datasets are described in a DCAT catalog (`assets/schema/dcat.jsonld`). |
| **Accessible** | Records export in three open standards: HL7 FHIR R4 JSON, openEHR JSON, and JSON-LD 1.1. Share via the OS share-sheet or (future) AWS endpoint. |
| **Interoperable** | All clinical concepts bind to public code systems — SNOMED CT, ICD-10, LOINC (planned), CoBaTrICE, Ottawa EPA — via a FHIR-style `CodedValue {system, code, display, mappings[]}` shape. |
| **Reusable** | Every record ships with provenance (app version, schema version, locale, timezone), a completeness + coding-confidence score, an SPDX license identifier (`CC-BY-NC-4.0` by default), and a consent status. |

### 11.2 Terminology bindings

The app holds a curated mapping from its local identifiers (what the user picks in the UI) to canonical codes (what gets exported):

| Concept | Primary binding | OBO / Monarch mapping | File |
|---|---|---|---|
| Diagnosis (ICD-10) | ICD-10 + SNOMED CT | **MONDO** (Monarch Disease Ontology) | `src/data/icd10.ts` |
| Organ system | SNOMED CT body-structure | **UBERON** (OBO anatomy) | `src/data/organSystems.ts` |
| CoBaTrICE domain | `https://w3id.org/iculogbook/cobatrice/<id>` | — | `src/data/cobatrice.ts` |
| Supervision level | Ottawa EPA entrustment scale | — | `src/data/supervision.ts` |
| Procedure type | SNOMED CT (where available) | **NCIT** (planned) | `src/data/procedures.ts` |

The canonical URIs for every code system live in `src/data/codeSystems.ts`, including the OBO Foundry PURLs (MONDO, UBERON, HP, NCIT, CHEBI, OBI, ENVO) and the Biolink Model prefix. Persistent IRIs use [w3id.org](https://w3id.org) redirects so the identifier stays stable even if hosting moves.

### 11.3 OBO Foundry + Monarch Initiative KG alignment

The healthcare-interoperability stack (FHIR / ICD-10 / SNOMED CT) is excellent for *clinical exchange* but is not directly joinable with the biomedical research graph. The biomedical research world lives on the [OBO Foundry](https://obofoundry.org) and the [Monarch Initiative KG](https://monarchinitiative.org), which are built on a different backbone: MONDO for diseases, UBERON for anatomy, HP for phenotypes, all aligned by the [Biolink Model](https://biolink.github.io/biolink-model/).

To make the ICU Logbook dataset valuable to *both* audiences, every coded value is exported as a **FHIR-style dual coding**: a primary clinical code plus an OBO mapping in the `mappings[]` array. Consumers pick whichever system their toolchain speaks.

**Mapping strategy:**

| Data element | Exported as | Joins with (Monarch KG / OBO) |
|---|---|---|
| Diagnosis | `ICD-10` (primary) + `SNOMED CT` + `MONDO` | gene–disease, phenotype–disease, drug–disease associations |
| Organ system | `SNOMED CT` (primary) + `UBERON` | tissue atlases, developmental-biology resources |
| Procedure | `SNOMED CT` (primary); `NCIT` planned | intervention/treatment graphs |
| Case / Procedure class | `icu:Case` / `icu:Procedure` → `biolink:ClinicalEntity` / `biolink:ClinicalIntervention` | entire Biolink-aligned ecosystem |

**How to join with the Monarch KG:**

1. Export records as JSON-LD (`Settings → Data Sharing & Export → JSON-LD`).
2. For each record, extract any `mappings[]` entry whose `system` starts with `http://purl.obolibrary.org/obo/`.
3. That MONDO/UBERON term IRI is the pivot — query the Monarch KG (via its [SPARQL endpoint](https://monarchinitiative.org/) or [BioLink API](https://api.monarchinitiative.org/api/)) for associated genes, phenotypes, drugs, model organisms, or published studies.
4. Join the results back to the ICU record via the persistent IRI (`https://w3id.org/iculogbook/id/case/<uuid>`).

Example — an exported MRSA-sepsis case will carry `ICD-10:A41.02`, `SNOMED:432295005`, and `MONDO:0005737` (sepsis). That MONDO term is already the central node for sepsis in the Monarch KG, so the case immediately lands in its gene/drug/phenotype neighbourhood with zero additional ETL.

**Ontologies used (OBO Foundry PURLs):**

| Ontology | Prefix | URL | Used for |
|---|---|---|---|
| Monarch Disease Ontology | `MONDO` | `http://purl.obolibrary.org/obo/mondo.owl` | Diagnoses |
| Uber-anatomy Ontology | `UBERON` | `http://purl.obolibrary.org/obo/uberon.owl` | Organ systems |
| Human Phenotype Ontology | `HP` | `http://purl.obolibrary.org/obo/hp.owl` | Phenotypes (future) |
| NCI Thesaurus | `NCIT` | `http://purl.obolibrary.org/obo/ncit.owl` | Procedures, drugs (planned) |
| Chemical Entities of Biological Interest | `CHEBI` | `http://purl.obolibrary.org/obo/chebi.owl` | Toxicology (future) |
| Ontology for Biomedical Investigations | `OBI` | `http://purl.obolibrary.org/obo/obi.owl` | Study-level metadata (planned) |
| Biolink Model | `biolink` | `https://w3id.org/biolink/vocab/` | Category alignment across all of the above |

The JSON-LD `@context` (both the inline copy in `JSONLDExporter.ts` and the published `assets/schema/context.jsonld`) carries all these prefixes, so any RDF tool that parses the export automatically gets dereferenceable OBO/Biolink IRIs.

### 11.4 Record shape (v2 schema)

Every saved `CaseLog` and `ProcedureLog` now carries, in addition to the original user-facing fields:

- `schemaVersion` — currently `"2.0.0"`
- `*Coded` fields — FHIR-Coding-shaped objects for every categorical field
- `provenance` — `{ appVersion, schemaVersion, deviceId, platform, locale, timezone }`
- `quality` — `{ completeness: 0–1, codingConfidence: 0–1 }`
- `consentStatus` — one of `none | anonymous | research | commercial`
- `license` — SPDX identifier (default `CC-BY-NC-4.0`)

Original columns (`diagnosis`, `organSystems`, `cobatriceDomains`, `supervisionLevel`) are preserved unchanged so the existing UI and sync path keep working. The v2 migration is additive (`ALTER TABLE ADD COLUMN`), so no existing data is touched.

### 11.5 Consent model

Consent is asked explicitly (`src/screens/ConsentScreen.tsx`) and persisted via `ConsentService`. Four options:

1. **Private** — records never leave the device.
2. **Anonymous aggregate only** — may be included in de-identified aggregate statistics (e.g. case-volume benchmarks). No individual record is ever released.
3. **Research** — additionally, fully-anonymised individual records may be shared with academic / training-body research partners under a non-commercial licence.
4. **Commercial** — additionally, fully-anonymised individual records may be included in commercial data products.

**Default is `commercial`** — an opt-out model justified by the fact that every payload is fully anonymised at the client before leaving the device. Consent status is attached to each record at save-time, so downgrading later only affects future records (the audit trail remains honest).

### 11.6 Export formats

From **Settings → Data Sharing & Export → Export (FHIR / openEHR / JSON-LD)**:

| Format | File | What it produces |
|---|---|---|
| **HL7 FHIR R4 Bundle** | `src/services/export/FHIRExporter.ts` | One Bundle containing Encounter + Condition + Observation (supervision, competency) + Provenance + Quality per case, plus Procedure resources. |
| **openEHR Composition** | `src/services/export/OpenEHRExporter.ts` | Composition with EVALUATION (problem_diagnosis), OBSERVATION (organ_system), and EVALUATION (entrustment) entries. |
| **JSON-LD 1.1** | `src/services/export/JSONLDExporter.ts` | Linked-data export with an inline `@context`. Parseable as RDF; joinable with any other SNOMED/ICD-10-coded dataset. |
| **Data dictionary** | `src/services/export/DataDictionary.ts` | Human-readable codebook describing every field and its terminology binding. Markdown. |

All formats filter by consent: only records with `consentStatus ∈ {anonymous, research, commercial}` are exported. Free-text fields are scrubbed for PII patterns, dates are shifted to epoch-week, and device IDs are redacted (`src/services/DeidentifyService.ts`).

### 11.7 Schema assets

The static schema artefacts live in `assets/schema/` and are intended to be published at stable URLs (e.g. via w3id.org redirects):

| File | Purpose | Canonical URL (planned) |
|---|---|---|
| `context.jsonld` | JSON-LD `@context` for every exported term | `https://w3id.org/iculogbook/context/v1.jsonld` |
| `ontology.ttl` | OWL ontology — classes, properties, labels, comments | `https://w3id.org/iculogbook/ontology` |
| `shapes.ttl` | SHACL shapes — validation rules for Case/Procedure | `https://w3id.org/iculogbook/shapes` |
| `dcat.jsonld` | DCAT catalog describing the three published datasets | `https://w3id.org/iculogbook/catalog` |

Consumers point their RDF toolchain at these URLs and get a fully self-describing, validatable dataset.

### 11.8 Backend plan (AWS, central)

Current sync client is a mock (`src/services/supabase.ts`). The production target is a central AWS backend (S3 + Postgres/RDS + API Gateway + Cognito). The worldwide rollout model is:

1. Device logs records locally (offline-first unchanged).
2. On sync, records upload to the trainee's private cloud store, with consent status attached.
3. The backend maintains three derived views per consent level, refreshed on each sync. Buyers query only the view matching their contract.
4. Since everything is already de-identified at the client before upload, there is no need for region-specific governance tooling — the dataset is fully anonymised at source.

### 11.9 Unit of sale (TBD)

Current architecture supports any of three billing models — no data-model change needed:

- **Per-record** — each `CaseLog` / `ProcedureLog` is individually priceable via its persistent IRI.
- **Per-snapshot** — quarterly DCAT distributions, cited by DOI (via DataCite).
- **Per-stream** — live subscription feed off the derived views.

We recommend starting with per-snapshot DOIs for research partners (highest academic legibility) and per-record for commercial integrations (cleanest contract boundary).

### 11.10 What we deliberately did *not* change

- The logbook UX. Users still pick chips and write reflections — there is no coding burden added to any screen.
- Existing columns in SQLite. The v2 migration is additive; v1 data stays queryable.
- Platform coverage. Web builds continue to work via the existing `.native.ts` / `.web.ts` split.

---

## 12. Architecture Decisions

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

## 13. Extending the App

### Adding a real Supabase backend

See [SETUP.md](SETUP.md) for step-by-step instructions including the SQL schema, environment variables, and how to replace the mock client.

### Swapping the mock server for real Supabase Auth

Real authentication is already wired in — the mock "server" is a second SQLite file with `users` and `sessions` tables and salted/hashed passwords. To go live:

1. Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage`
2. Replace the bodies of the six exports in `src/services/AuthService.ts` (`signIn`, `restoreSession`, `signOut`, `listUsers`, `createUser`, `updateUserRole`, `setUserDisabled`, `resetUserPassword`, `deleteUser`, `hasAnyUser`, `createFirstAdmin`) with Supabase Auth / RPC calls — every screen and store reads through this single file.
3. Replicate the `owner_id` / `supervisor_user_id` / `observer_user_id` columns in the Supabase `case_logs` / `procedure_logs` tables and write Row-Level Security policies that mirror `AuthScope.ts` (`admin sees all`, user sees `owner OR supervisor OR observer`).
4. Decide what to do with the first-run setup flow: in production the first admin is usually seeded via a Supabase dashboard invite, not by any app user. Either hide the setup screen behind a build flag, or keep it for self-hosted / on-prem deployments.

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

## 14. Troubleshooting

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

- Cases are stored locally in `icu_logbook.db`. If you reinstalled the app, the file was deleted.
- Visibility is owner-scoped. Signed in as a non-admin user, you only see records where you are the **owner**, **supervisor**, or **observer**. Cases you created from a different account won't appear — sign in as that account, or use an admin account.
- If the app is stuck on the setup screen, the server DB has zero users (normal after a fresh install). Complete the setup to create the initial admin.

### I want to wipe everything and start over

Erase the simulator (iOS: *Device → Erase All Content and Settings…*) or delete the Expo Go / dev-client app. Both SQLite files live inside the app sandbox so uninstalling removes all data, including the admin account. On next launch you'll see the first-run setup screen again.

---

## 15. Glossary

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
| **FAIR** | Findable, Accessible, Interoperable, Reusable — a set of principles for scientific data management |
| **SNOMED CT** | Systematized Nomenclature of Medicine — Clinical Terms. The most comprehensive clinical terminology in the world. |
| **LOINC** | Logical Observation Identifiers Names and Codes — a code system for laboratory and clinical observations |
| **CoBaTrICE** | Competency Based Training in Intensive Care Medicine for Europe — a 12-domain competency framework |
| **Ottawa EPA** | Ottawa Entrustable Professional Activity framework — standard scale for supervision / entrustment |
| **FHIR** | Fast Healthcare Interoperability Resources — HL7's JSON-based healthcare data standard |
| **openEHR** | An open standard for structured electronic health records, widely used in EU research |
| **JSON-LD** | JSON for Linked Data — adds semantic meaning to JSON via a `@context` |
| **RDF** | Resource Description Framework — W3C standard for representing linked data |
| **OWL** | Web Ontology Language — W3C standard for representing ontologies |
| **SHACL** | Shapes Constraint Language — W3C standard for validating RDF data |
| **DCAT** | Data Catalog Vocabulary — W3C standard for describing datasets in a catalog |
| **PROV-O** | Provenance Ontology — W3C standard for describing where data came from |
| **IRI** | Internationalised Resource Identifier — a persistent URL that identifies a resource |
| **w3id.org** | A permanent-identifier redirect service used for ontology URIs that must outlive any specific host |
| **SPDX** | Software Package Data Exchange — a standard for declaring licenses by short identifier (e.g. `CC-BY-NC-4.0`) |
| **DataCite / DOI** | Digital Object Identifiers for datasets — citable, persistent references |
| **Epoch week** | ISO week number since Unix epoch. A de-identification technique that preserves temporal patterns without exposing exact dates. |
| **OBO Foundry** | A community of biomedical ontology authors committed to shared design principles and non-overlapping scope. Home of MONDO, UBERON, HP, etc. |
| **MONDO** | Monarch Disease Ontology — an integrated disease ontology unifying ICD, SNOMED, OMIM, Orphanet, DOID, and NCIT under a single set of identifiers |
| **UBERON** | The integrated cross-species anatomy ontology used across OBO and the Monarch KG |
| **HP (HPO)** | Human Phenotype Ontology — the standard for describing clinical phenotypic abnormalities |
| **NCIT** | NCI Thesaurus — a terminology maintained by the US National Cancer Institute, widely used for procedures and drugs |
| **CHEBI** | Chemical Entities of Biological Interest — an OBO ontology for small molecules and drugs |
| **Monarch Initiative KG** | A cross-species biomedical knowledge graph aligning disease, phenotype, gene, drug, and model-organism data. Built on OBO ontologies and the Biolink Model. |
| **Biolink Model** | A high-level schema aligning biomedical data sources under common categories (e.g. `ClinicalEntity`, `ClinicalIntervention`). The lingua franca of the Monarch KG. |
| **PURL** | Persistent URL — a redirect service (e.g. `purl.obolibrary.org`) that gives ontology terms stable identifiers even when hosting moves |
