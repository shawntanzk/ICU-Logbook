# App Store Submission Checklist — ICU Logbook

> **Status key:** ✅ Done · 🔧 Needs action · ⚠️ Decision required

---

## Part 1 — Apple App Store (iOS)

### 1.1 Apple Developer Account & App Record
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Enrol in Apple Developer Program at [developer.apple.com](https://developer.apple.com) ($99 USD/year) | 🔧 | Need an Apple ID with 2FA enabled |
| 2 | Create app record in App Store Connect at [appstoreconnect.apple.com](https://appstoreconnect.apple.com) | 🔧 | Name: "ICU Logbook" · Bundle ID: `com.iculogbook.app` |
| 3 | Note your **Apple Team ID** (found in Membership section) | 🔧 | Needed for `eas.json` `appleTeamId` |
| 4 | Note your **ASC App ID** (10-digit number on the App record) | 🔧 | Needed for `eas.json` `ascAppId` |

### 1.2 Code Signing
| # | Task | Status | Notes |
|---|------|--------|-------|
| 5 | Run `eas credentials` to provision Distribution Certificate + App Store provisioning profile | 🔧 | EAS manages this automatically |
| 6 | Alternatively: generate manually in Xcode via *Product → Archive → Distribute App → App Store Connect* | ⚠️ | Manual route if not using EAS |

### 1.3 App Metadata (App Store Connect)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 7 | App name: **ICU Logbook** | 🔧 | Max 30 characters |
| 8 | Subtitle: **Critical Care Competency Tracker** | 🔧 | Max 30 characters |
| 9 | Category: **Medical** (primary) · **Education** (secondary) | 🔧 | |
| 10 | Age rating: **4+** (no objectionable content; medical professional app) | 🔧 | Answer questionnaire: select "None" for all categories |
| 11 | Description: 4,000 character rich description | 🔧 | See draft below |
| 12 | Keywords: max 100 characters | 🔧 | `ICU,logbook,anaesthesia,critical care,medical training,competency,ARCP,portfolio` |
| 13 | Support URL | 🔧 | e.g. `https://iculogbook.com/support` |
| 14 | Marketing URL | 🔧 | e.g. `https://iculogbook.com` |
| 15 | Privacy Policy URL | 🔧 | Host `docs/privacy-policy.html` — e.g. GitHub Pages URL, then update `app.json → extra.privacyPolicyUrl` |

### 1.4 Screenshots (Required — cannot be skipped)
| Device | Size | Required |
|--------|------|----------|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 px | ✅ At least 3 |
| iPhone 6.5" (iPhone 15 Plus / 14 Plus) | 1242 × 2688 px | ✅ At least 3 |
| iPad Pro 13" (M4) | 2064 × 2752 px | ✅ If `supportsTablet: true` |

**How:** Run the app in a simulator, use `Simulator → File → Take Screenshot`, or use [fastlane snapshot](https://docs.fastlane.tools/actions/snapshot/).

### 1.5 App Icon
| # | Task | Status | Notes |
|---|------|--------|-------|
| 16 | App icon at 1024×1024 px (no alpha channel, no rounded corners — Apple applies the mask) | ✅ | Present at `ios/ICULogbook/Images.xcassets/AppIcon.appiconset/` |
| 17 | Verify icon meets [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons) | 🔧 | No small text; visible at 60×60 |

### 1.6 Privacy & Compliance
| # | Task | Status | Notes |
|---|------|--------|-------|
| 18 | **Export compliance pre-declared** in `Info.plist` | ✅ | `ITSAppUsesNonExemptEncryption = false` — eliminates per-upload questionnaire |
| 19 | **Privacy Nutrition Labels** in App Store Connect → App Privacy | 🔧 | See answers below |
| 20 | **Privacy manifest** (`PrivacyInfo.xcprivacy`) | ✅ | Present and configured |
| 21 | `LSMinimumSystemVersion` matches deployment target | ✅ | Both set to 15.1 |

#### Privacy Nutrition Label Answers
Navigate to **App Store Connect → [Your App] → App Privacy → Get Started**:

| Question | Answer |
|----------|--------|
| Does your app collect data? | **Yes** |
| **Data types collected:** | |
| → Contact info — Email address | ✅ Used for account management |
| → Health & fitness — Health records / Other health data | ✅ Clinical log entries (optional, user-entered) |
| → Identifiers — User ID | ✅ Used internally |
| Is data linked to identity? | **Yes** (Email, User ID) · **No** (Health data is anonymised) |
| Is data used for tracking? | **No** |
| Third-party sharing? | Supabase (listed as infrastructure, not advertising) |

### 1.7 Building & Uploading
| # | Task | Status | Notes |
|---|------|--------|-------|
| 22 | Install EAS CLI: `npm install -g eas-cli && eas login` | 🔧 | |
| 23 | Link project to EAS: `eas build:configure` | 🔧 | Adds `extra.eas.projectId` to `app.json` |
| 24 | Set Supabase secrets as EAS secrets: `eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value <url>` | 🔧 | Repeat for `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| 25 | Production build: `eas build --platform ios --profile production` | 🔧 | Takes ~15 min on EAS |
| 26 | Submit to App Store: `eas submit --platform ios --profile production` | 🔧 | After build completes |
| 27 | Or upload manually via Transporter (macOS app from App Store) | ⚠️ | Alternative to EAS submit |
| 28 | Complete review answers in App Store Connect: content rights, advertising identifier (select No) | 🔧 | |

### 1.8 TestFlight (Before Production Submission)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 29 | Add internal testers (up to 100, no review needed) | 🔧 | Add in App Store Connect |
| 30 | Add external testers and submit for Beta App Review | 🔧 | Required for external testing |
| 31 | Test on physical devices: iPhone and iPad | 🔧 | Deep-link flow, biometrics, offline mode |

---

## Part 2 — Google Play Store (Android)

### 2.1 Google Play Console Account
| # | Task | Status | Notes |
|---|------|--------|-------|
| 32 | Register as Google Play Developer at [play.google.com/console](https://play.google.com/console) ($25 USD one-time) | 🔧 | |
| 33 | Create app: *Create app → App → Free → Android → Not a game → Developer Program Policy accepted* | 🔧 | Package: `com.iculogbook.app` |

### 2.2 Production Keystore (CRITICAL — Do this before any build)
```bash
# Generate once. Store securely — you cannot re-sign updates with a different key.
keytool -genkey -v \
  -keystore release.keystore \
  -alias iculogbook \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=ICU Logbook, OU=Mobile, O=Your Org, L=Your City, S=Your State, C=AU"

# Add to ~/.gradle/gradle.properties (never commit this file):
ICULOGBOOK_STORE_FILE=/absolute/path/to/release.keystore
ICULOGBOOK_STORE_PASSWORD=your_store_password
ICULOGBOOK_KEY_ALIAS=iculogbook
ICULOGBOOK_KEY_PASSWORD=your_key_password
```
| # | Task | Status | Notes |
|---|------|--------|-------|
| 34 | Generate production keystore | 🔧 | See command above |
| 35 | Back up keystore securely (password manager, encrypted drive) | 🔧 | Losing it = cannot publish updates |
| 36 | **Enroll in Play App Signing** (recommended): upload your keystore to Google | 🔧 | Google re-signs your builds; you keep a backup upload key |

### 2.3 App Metadata
| # | Task | Status | Notes |
|---|------|--------|-------|
| 37 | Short description (max 80 chars) | 🔧 | `Track ICU & anaesthesia procedures, cases, and competencies.` |
| 38 | Full description (max 4,000 chars) | 🔧 | See draft below |
| 39 | Category: **Medical** | 🔧 | |
| 40 | Content rating questionnaire | 🔧 | IARC questionnaire — answer "None" to violence/adult content. Will receive "Everyone" or "Teen" rating. |
| 41 | Privacy policy URL | 🔧 | Same URL as iOS |
| 42 | App icon (512×512 px, PNG, ≤1 MB) | 🔧 | Adapt from the 1024×1024 iOS icon |

### 2.4 Screenshots
| Device | Spec | Min required |
|--------|------|-------------|
| Phone | 16:9 or 9:16, ≥320px shortest side | 2 |
| 7" tablet | 16:10 | 1 (if tablet-optimised) |
| 10" tablet | 16:10 | 1 (if tablet-optimised) |

### 2.5 Data Safety Form
Navigate to **Play Console → Policy → App content → Data safety**:

| Section | Answer |
|---------|--------|
| Does your app collect or share user data? | **Yes** |
| **Data types — Personal info** | |
| → Email address | ✅ Collected · Account management · Not shared |
| → Name | ✅ Collected · App functionality · Not shared |
| **Data types — Health and fitness** | |
| → Health info | ✅ Collected · App functionality · Not shared |
| **Data types — App activity** | |
| → App interactions | ✅ Collected · App functionality · Not shared |
| Is data encrypted in transit? | **Yes** (TLS/HTTPS) |
| Can users request data deletion? | **Yes** (Settings → Delete Account + email contact) |
| Is data collection required? | Required for core functionality |

### 2.6 API Level Requirements (Play Policy)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 43 | `targetSdkVersion = 34` | ✅ | Already set in `android/build.gradle` |
| 44 | `compileSdkVersion = 35` | ✅ | Already set |
| 45 | `minSdkVersion = 24` (Android 7.0) | ✅ | Already set |

### 2.7 Building & Publishing
| # | Task | Status | Notes |
|---|------|--------|-------|
| 46 | Build AAB: `eas build --platform android --profile production` | 🔧 | Outputs `.aab` file |
| 47 | Create Google Play Service Account (for `eas submit`): GCP Console → IAM → Service Account → Play Developer API | 🔧 | Download JSON key |
| 48 | Add service account JSON path to `eas.json` `submit.production.android.serviceAccountKeyPath` | 🔧 | Do NOT commit this file |
| 49 | Add to `.gitignore`: `google-play-service-account.json` | 🔧 | |
| 50 | Upload to Play Console (Internal Testing first): `eas submit --platform android --profile production` | 🔧 | |
| 51 | Promote from Internal → Closed → Open → Production testing tracks | 🔧 | 2–7 day review per promotion |

---

## Part 3 — Backend & Secrets Setup

### 3.1 Supabase Edge Functions
| # | Task | Status | Notes |
|---|------|--------|-------|
| 52 | Generate `MED_REG_PEPPER`: `openssl rand -hex 32` | 🔧 | **Store permanently** — changing it invalidates all stored hashes |
| 53 | Set secret: `supabase secrets set MED_REG_PEPPER=<value>` | 🔧 | |
| 54 | Generate `VALIDATOR_SECRET`: `openssl rand -hex 32` | 🔧 | Share only with authorised validators |
| 55 | Set secret: `supabase secrets set VALIDATOR_SECRET=<value>` | 🔧 | |
| 56 | Deploy: `supabase functions deploy register --no-verify-jwt` | 🔧 | |
| 57 | Deploy: `supabase functions deploy set-registration` | 🔧 | |
| 58 | Deploy: `supabase functions deploy validate-registration --no-verify-jwt` | 🔧 | |
| 59 | Deploy: `supabase functions deploy admin-users --no-verify-jwt` | 🔧 | Existing function |

### 3.2 GitHub CI Secrets
| Secret | Value | Status |
|--------|-------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | 🔧 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | 🔧 |
| `EXPO_TOKEN` | EAS access token from `eas token:create` | 🔧 |

---

## Part 4 — Store Listing Copy (Draft)

### Short Description (Google Play / TestFlight What's New)
```
ICU Logbook is the digital portfolio for intensive care and anaesthesia trainees.
Log cases, procedures, ward reviews, transfers, and resuscitations. Track competencies,
export your ARCP portfolio, and get supervisor sign-off — all offline-first.
```

### Full Description
```
ICU Logbook is built for anaesthesia, intensive care, and critical care trainees
who need a reliable, professional digital logbook for their training portfolio.

WHAT YOU CAN LOG
• ICU / HDU cases — diagnosis, organ systems, COBATRICE domains, supervision level
• Ward reviews, ED attendances, transfers, medicine placements
• Procedures — airway management, arterial lines, CVC insertion, ultrasound,
  regional anaesthesia
• Reflections and learning points for each entry

PORTFOLIO & COMPETENCY
• Real-time competency map across all COBATRICE domains
• ARCP-ready CSV export covering all 10 log types
• Quality score for each case — complete data means better evidence
• Supervisor approval workflow with digital sign-off

PRIVACY & SECURITY
• Your medical registration number is encrypted (HMAC-SHA256) on our servers —
  not even administrators can read it
• Row-level security: only you and your named supervisors can see your data
• Works fully offline; syncs when connectivity returns
• GDPR-compliant with in-app account deletion

DESIGNED FOR TRAINEES
• Clean, fast interface built for use at the bedside
• Covers UK, Irish, Australian, and international training frameworks
• No ads, no tracking, no data sold to third parties

Requires a valid medical registration number at sign-up.
```

---

## Part 5 — Post-Launch Checklist

| # | Task |
|---|------|
| 60 | Set up **crash reporting** (Sentry or similar) before launch |
| 61 | Configure **Supabase rate limiting** on the `register` Edge Function (prevent account spam) |
| 62 | Monitor App Store Connect and Play Console for review feedback |
| 63 | Respond to App Store review within 24 hours if queried |
| 64 | Plan **push notification** infrastructure before v1.1 (approval reminders, new feature alerts) |
| 65 | Set up **Supabase database backups** (Point-in-Time Recovery) |
| 66 | Consider **App Store Small Business Programme** (15% commission if revenue < $1M/year) |

---

*Last updated: 2026-04-24 · Version: 1.0.0 · Build: 1*
