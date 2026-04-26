# ICU Logbook — Production Readiness Summary

**Feed this file to an LLM for task-specific guidance.**
Stack: React Native · Expo SDK 52 · Supabase (Postgres + Edge Functions) · Bare workflow · TypeScript strict · Zustand · React Navigation v6

---

## DONE (already implemented)

- Supabase auth (email/password + Google OAuth + PKCE)
- Row-level security on all tables (case_logs, procedure_logs, 9 new clinical tables)
- Self-registration with HMAC-SHA256 encrypted medical registration number (`supabase/functions/register/`)
- Country picker at registration (ISO 3166-1 list in `src/data/countries.ts`)
- Validator tool for training bodies (`supabase/functions/validate-registration/` + `docs/validator.html`)
- iOS export compliance (`ITSAppUsesNonExemptEncryption = false` in Info.plist)
- Android permissions cleaned up (no SYSTEM_ALERT_WINDOW, no READ_EXTERNAL_STORAGE)
- Android release signing via `~/.gradle/gradle.properties` env vars
- `eas.json` with dev/preview/production profiles
- CI/CD via GitHub Actions using `eas build` (not deprecated `expo build`)
- ARCP CSV export covering all 10 log types
- Privacy policy HTML (`docs/privacy-policy.html`)
- App Store submission guide (`APP_STORE_SUBMISSION.md`)

---

## MUST DO BEFORE FIRST SUBMISSION

### Secrets (Supabase)
```bash
supabase secrets set MED_REG_PEPPER=$(openssl rand -hex 32)   # STORE THIS PERMANENTLY
supabase secrets set VALIDATOR_SECRET=$(openssl rand -hex 32) # Give to authorised validators only
```
**Warning:** `MED_REG_PEPPER` cannot be changed after users have registered — it would invalidate all stored hashes.

### Deploy Edge Functions
```bash
supabase functions deploy register --no-verify-jwt
supabase functions deploy set-registration
supabase functions deploy validate-registration --no-verify-jwt
supabase functions deploy admin-users --no-verify-jwt
```

### iOS (Apple)
1. Enrol in Apple Developer Program ($99/year) at developer.apple.com
2. Create app record in App Store Connect — bundle ID `com.iculogbook.app`
3. Fill in `eas.json` `submit.production.ios` with your `appleId`, `ascAppId`, `appleTeamId`
4. Run `eas build --platform ios --profile production` (handles signing automatically)
5. Fill Privacy Nutrition Labels in App Store Connect (Email + Health data, no tracking)
6. Take screenshots on iPhone 6.9" and 6.5" simulators (required — no upload without them)
7. Host `docs/privacy-policy.html` at a public URL; update `app.json → extra.privacyPolicyUrl`

### Android (Google Play)
1. Register Google Play Developer account ($25 one-time) at play.google.com/console
2. Generate release keystore: `keytool -genkey -v -keystore release.keystore -alias iculogbook -keyalg RSA -keysize 2048 -validity 10000`
3. Add to `~/.gradle/gradle.properties`: `ICULOGBOOK_STORE_FILE`, `ICULOGBOOK_STORE_PASSWORD`, `ICULOGBOOK_KEY_ALIAS`, `ICULOGBOOK_KEY_PASSWORD`
4. Enrol in Play App Signing (Google stores backup; you keep upload key)
5. Run `eas build --platform android --profile production` → outputs `.aab`
6. Complete Data Safety form (Email + Health data, encrypted in transit, deletion available)
7. Take screenshots for phone + 7" tablet
8. Fill app content rating questionnaire (IARC — select "None" for all sensitive categories)

### GitHub CI
Add these secrets in GitHub repo Settings → Secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_TOKEN` (from `eas token:create`)

---

## SHOULD DO (before v1.0 is live to users)

| Priority | Task | Why |
|----------|------|-----|
| HIGH | Crash reporting (Sentry) | You will not know about silent crashes without it |
| HIGH | Rate-limit the `register` Edge Function | Prevent spam account creation |
| HIGH | Database Point-in-Time Recovery | Enable in Supabase dashboard under Database |
| HIGH | Test full offline → online sync on physical device | Biggest risk area for medical data |
| MEDIUM | Push notifications (approval reminders) | Core expected feature for supervisor workflow |
| MEDIUM | Add `google-play-service-account.json` to `.gitignore` | Security — it grants Play Console write access |
| MEDIUM | Sentry DSN as EAS secret (not hardcoded) | Currently error reporting may be a stub |
| LOW | App Store Connect — add localised descriptions for target markets | If launching in non-English markets |
| LOW | Accessibility audit (VoiceOver on iOS, TalkBack on Android) | Required for NHS/NHS Digital apps |

---

## KNOWN ISSUES TO FIX

| File | Issue |
|------|-------|
| `src/services/AuthService.ts` | `signUp()` still accepts `{ email, displayName, password }` — old signup path. Now superseded by the `register` Edge Function. The store's `signUp` action should be removed or redirected to clarify which path is canonical. |
| `src/screens/SettingsScreen.tsx` | "Change Password" screen still exists but users who registered via the new flow should be guided to set a password if they used Google OAuth only. |
| `docs/validator.html` | `SUPABASE_FUNCTION_URL` is hardcoded with the project URL — update if project changes. |
| `eas.json` | `submit.production.ios` has placeholder values — fill before `eas submit`. |
| `eas.json` | `submit.production.android.serviceAccountKeyPath` points to `./google-play-service-account.json` — this file must be created but NOT committed. |

---

## ARCHITECTURE NOTES (for LLM context)

- **Medical reg number flow:** client → HTTPS → `register` Edge Function → HMAC-SHA256(normalize(number), MED_REG_PEPPER) → store hex in `profiles.med_reg_hmac`. Original never touches DB.
- **Validator flow:** authorised party → validator HTML → HTTPS + `X-Validator-Secret` header → `validate-registration` Edge Function → HMAC lookup → yes/no + country.
- **Navigation gate order:** `!isLoggedIn` → Login/Register → `!termsAccepted` → Terms → `!profileComplete` → CompleteRegistration → Main tabs.
- **`profileComplete`** is true when both `profiles.country IS NOT NULL` and `profiles.med_reg_hmac IS NOT NULL`.
- **Google OAuth users** bypass the registration form → hit `CompleteRegistrationScreen` after first login → call `set-registration` Edge Function with JWT auth.
- **`MED_REG_PEPPER` is forever** — once set and users have registered, it cannot be rotated without re-collecting all registration numbers.

---

*Generated: 2026-04-24 · App version: 1.0.0*
