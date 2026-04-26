# Privacy Policy

**Last updated: April 2026**

ICU Logbook ("the App", "we", "us") is a professional medical training logbook designed for
intensive care and anaesthesia trainees. This policy explains what data the App collects,
why, and how it is protected.

---

## 1. Who We Are

ICU Logbook is operated by [YOUR NAME / ORGANISATION].

Contact: [privacy@iculogbook.com](mailto:privacy@iculogbook.com)

---

## 2. What Data We Collect

| Category | Examples | Why collected |
|----------|----------|---------------|
| Account data | Email address, hashed password | Authentication and account management |
| Clinical log entries | Date, diagnosis, procedure type, supervision level, reflection notes | Core logbook functionality; training portfolio |
| Procedure records | Procedure type, outcome, number of attempts, complications | Competency tracking and supervisor approval |
| Supervisor linkage | Supervisor user ID or free-text name | Approval workflow and attestation |
| Device & usage data | OS version, app version, crash reports | Bug fixing and compatibility |

**Patient data:** The App is designed so that *no patient-identifiable information is
collected or required*. Log entries use anonymised descriptors (diagnosis category, age
range, sex) only. Do not enter patient names, NHS numbers, or other direct identifiers.

---

## 3. What We Do Not Collect

- Precise location data
- Camera, microphone, or photo library access
- Contacts or calendar data
- Advertising identifiers or cross-app tracking
- Biometric data (Face ID / Touch ID is handled entirely by the OS and is never transmitted)

---

## 4. How Data Is Stored

Data is stored in two places:

- **On-device (SQLite):** A local encrypted database stores your log entries for offline
  access. The database is not accessible to other apps.
- **Cloud (Supabase / PostgreSQL):** When online, data is synchronised to a
  Supabase-hosted PostgreSQL database secured with row-level security (RLS). Only you,
  your designated supervisors, and authorised administrators can access your records.
  The database is hosted in the EU (AWS eu-west region).

All data in transit is encrypted with TLS 1.2+. At-rest encryption is provided by the
hosting platform.

---

## 5. Data Sharing

We share your data with:

- **Supabase Inc.** — database hosting and authentication provider.
- **Your supervisors / training programme administrators** — as granted by you via the
  in-app supervisor consent feature.

We do **not** sell, rent, or share your data with advertisers or any other third party.

---

## 6. Data Retention

Your data is retained for as long as your account is active. You may request deletion of
your account and all associated data at any time by emailing
[privacy@iculogbook.com](mailto:privacy@iculogbook.com). Data will be permanently deleted
within 30 days of a verified deletion request.

---

## 7. Your Rights (GDPR / UK GDPR)

You have the right to:

- Access a copy of your personal data
- Correct inaccurate data
- Request erasure ("right to be forgotten")
- Object to or restrict processing
- Data portability (CSV export is available in-app)
- Lodge a complaint with the ICO (UK) or your national supervisory authority

To exercise any of these rights, email [privacy@iculogbook.com](mailto:privacy@iculogbook.com).

---

## 8. Children

The App is intended for healthcare professionals and medical trainees aged 18 and over.
We do not knowingly collect data from anyone under 18.

---

## 9. iOS & Android Platform Disclosures

- **Face ID / Biometrics:** The App uses iOS Secure Enclave / Android Keystore for
  optional biometric lock. Biometric data never leaves your device and is never
  transmitted to our servers.
- **Keychain / Secure Store:** Authentication tokens are stored in iOS Keychain /
  Android Keystore, accessible only to this App.
- **Encryption:** The App uses only standard HTTPS/TLS for all network communication.
  No custom or non-exempt encryption algorithms are used.

---

## 10. Changes to This Policy

We may update this policy from time to time. Material changes will be notified in-app.
Continued use of the App after notice constitutes acceptance of the updated policy.

---

## 11. Contact

Questions or concerns? Email [privacy@iculogbook.com](mailto:privacy@iculogbook.com).

---

*© 2026 ICU Logbook. All rights reserved.*
