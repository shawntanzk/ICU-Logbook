# Infrastructure

This document describes every external service that ICU Logbook depends on,
what it does, where it is managed, and how it connects to the rest of the system.

---

## Overview

```
Users (iOS / Android)
        │
        ▼
  EAS / App Store / Play Store
        │
        ▼
  React Native app  ──────────────────────────────┐
                                                   │
Users (Web)                                        │
        │                                          ▼
        ▼                                      Supabase
  icu-logbook-app.signamind.com            (Auth, Database,
        │                                   Edge Functions,
        ▼                                   Storage, RLS)
      Vercel
   (Next.js webapp)

signamind.com  →  GitHub Pages (SignaMind/ghpages)
       DNS managed by Porkbun
```

---

## Services

### Supabase
**Role:** Backend — authentication, PostgreSQL database, Row Level Security,
Edge Functions, and real-time sync.

| Detail | Value |
|--------|-------|
| Console | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Account | shawntanzhengkai@gmail.com |
| Project URL | `https://qbkrgjbcizpcunwmzhrq.supabase.co` |

**What lives here:**
- All clinical data tables (`case_logs`, `procedure_logs`, etc.)
- Auth providers (email/password, Google OAuth)
- Edge Functions (`register`, `admin-users`, `set-registration`)
- Row Level Security policies (data scoped by `owner_id`)
- `profiles` table (display name, role, country, med reg hash)

**Key config locations:**
- Authentication → URL Configuration → Site URL and Redirect URLs
- Authentication → Providers → Google (Client ID + Secret from Google Cloud Console)
- Database → Migrations (version-controlled in `supabase/`)

---

### Vercel
**Role:** Hosts the Next.js webapp at `icu-logbook-app.signamind.com`.

| Detail | Value |
|--------|-------|
| Console | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Account | shawntanzhengkai@gmail.com (GitHub login) |
| Production URL | `https://icu-logbook-app.signamind.com` |
| Source | `shawntanzk/ICU-Logbook` → `webapp/` directory |
| Framework | Next.js (auto-detected) |
| Root Directory | `webapp` |

**Environment variables set in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Deployment trigger:** Every push to `main` automatically deploys via Vercel's
GitHub integration. No manual action required.

---

### Porkbun
**Role:** DNS registrar and nameserver for `signamind.com`.

| Detail | Value |
|--------|-------|
| Console | [porkbun.com](https://porkbun.com) |
| Account | *(Porkbun login)* |
| Domain | `signamind.com` |

**Current DNS records:**

| Type | Host | Points to | Purpose |
|------|------|-----------|---------|
| `A` / `CNAME` | `@` | GitHub Pages | `signamind.com` main site |
| `CNAME` | `icu-logbook-app` | `[value].vercel-dns-017.com` | Webapp on Vercel |

**To update DNS:** Porkbun dashboard → Domain Management → `signamind.com` → DNS.

---

### GitHub
**Role:** Source control, CI/CD via GitHub Actions.

| Detail | Value |
|--------|-------|
| Main repo | [github.com/shawntanzk/ICU-Logbook](https://github.com/shawntanzk/ICU-Logbook) |
| Pages repo | [github.com/SignaMind/ghpages](https://github.com/SignaMind/ghpages) |

**CI/CD pipeline** (`.github/workflows/ci.yml`):

| Job | Trigger | What it does | Status |
|-----|---------|-------------|--------|
| `test` | Every push / PR | TypeScript typecheck + Jest coverage | ✅ Active |
| `build-android` | Push to `main` only | Triggers EAS Android build (AAB) | ✅ Active |
| `build-ios` | Push to `main` only | Triggers EAS iOS build (IPA) | ⏸ Disabled |

> **iOS builds are disabled** (`if: false` in the workflow) until an Apple Developer
> account ($99/year) is set up. To re-enable:
> 1. Enrol at [developer.apple.com](https://developer.apple.com)
> 2. Run `eas credentials --platform ios` locally to configure signing credentials
> 3. Remove the `if: false` line from the `build-ios` job in `.github/workflows/ci.yml`

**GitHub Actions secrets required:**

| Secret | Purpose |
|--------|---------|
| `EXPO_TOKEN` | Authenticates EAS CLI (Developer-role robot user) |
| `EXPO_PUBLIC_SUPABASE_URL` | Passed to EAS build environment |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Passed to EAS build environment |

---

### EAS (Expo Application Services)
**Role:** Cloud build service for iOS and Android native app binaries.

| Detail | Value |
|--------|-------|
| Console | [expo.dev](https://expo.dev) |
| Account | shawntanzhengkai@gmail.com |
| CI auth | Robot user with **Developer** role, token stored as `EXPO_TOKEN` GitHub secret |
| Config | `eas.json` in repo root |

**Build profiles (`eas.json`):**
- `production` — triggers App Store / Play Store distributable builds
- Builds are queued on Expo's servers; status visible at expo.dev/builds

**`--no-wait` flag:** CI triggers the build and exits immediately.
Monitor build progress at expo.dev/builds.

---

### GitHub Pages
**Role:** Hosts the `signamind.com` main/marketing site.

| Detail | Value |
|--------|-------|
| Repo | [github.com/SignaMind/ghpages](https://github.com/SignaMind/ghpages) |
| URL | `https://signamind.com` |
| DNS | Managed in Porkbun (A record pointing to GitHub Pages IPs) |

This is separate from the ICU Logbook webapp. Any changes to `signamind.com`
are made in the `SignaMind/ghpages` repository, not this one.

---

### Google Cloud Console
**Role:** OAuth 2.0 credentials for Google Sign-In (used by both the mobile
app and the webapp via Supabase).

| Detail | Value |
|--------|-------|
| Console | [console.cloud.google.com](https://console.cloud.google.com) |
| Account | shawntanzhengkai@gmail.com |

**OAuth 2.0 Client — required config:**

| Setting | Values |
|---------|--------|
| Authorised JavaScript Origins | `http://localhost:3000`, `https://icu-logbook-app.signamind.com` |
| Authorised Redirect URIs | `https://qbkrgjbcizpcunwmzhrq.supabase.co/auth/v1/callback` |

The Client ID and Client Secret are entered in Supabase under
Authentication → Providers → Google. They are **never** stored in this repo.

---

## Secret / Credential Locations

| Credential | Where it lives | Never stored in |
|------------|---------------|-----------------|
| Supabase service role key | Supabase Edge Function env only | Client app, this repo |
| Supabase anon key | Vercel env vars, GitHub Actions secrets | Hardcoded in source |
| Google OAuth Client Secret | Supabase dashboard | This repo |
| EAS / Expo token | GitHub Actions secret (`EXPO_TOKEN`) | This repo |
| Porkbun login | Porkbun account | Anywhere |

---

## Local Development

No infrastructure changes are needed to run locally. Copy `.env.example` to
`.env.local` in `webapp/` and fill in the Supabase URL and anon key.

```bash
# webapp/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://qbkrgjbcizpcunwmzhrq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

The mobile app reads the same values at build time via `app.config.js` /
`eas.json` environment variables.
