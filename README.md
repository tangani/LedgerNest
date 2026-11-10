# 🪺 LedgerNest

**Personal debts. Business capital. A clearer picture.**

LedgerNest helps answer three questions:

- **Who owes me?**
- **Who do I owe?**
- **How much capital have I put into my businesses, and how much has come back?**

Built with React, TypeScript, Vite, Kotlin, Micronaut and PostgreSQL, with an Android application packaged through Capacitor.

**Website:** [https://ledgernest.co.za](https://ledgernest.co.za)  
**Backend:** [https://ledgernest-api.onrender.com](https://ledgernest-api.onrender.com)  
**Repository:** [tangani/LedgerNest](https://github.com/tangani/LedgerNest)

> **Status — 10 November 2026:** The application is deployed using the `ledgernest.co.za` frontend domain. Sign-in and SMS account recovery are working end to end, as confirmed by the project owner. Personal-debt workflows are API-backed, business-capital workflows are implemented, and Android builds are available for development testing. Registration phone verification and mandatory sign-in MFA remain separate development work. Store publication is not claimed by this README.

## Contents

- [What LedgerNest does](#what-ledgernest-does)
- [Financial model](#financial-model)
- [Accounts and recovery](#accounts-and-recovery)
- [Currency conversion](#currency-conversion)
- [Architecture](#architecture)
- [Local development](#local-development)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Android development](#android-development)
- [Data integrity and security](#data-integrity-and-security)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Licence and legal documents](#licence-and-legal-documents)

## What LedgerNest does

The workspace has three main areas:

| Area | Purpose |
| --- | --- |
| Personal debts | Record money owed to you and money you owe; track repayments and outstanding balances. |
| Business | Record contributions and returned capital; see capital still invested. |
| Recent activity | Review repayments and business transactions. Older local activity may also appear where retained. |

The interface uses compact cards, modal editors and mobile-friendly layouts. Account settings provide sign-in identifier management, display preferences, recovery setup and account deletion where the corresponding updates are installed.

### Implemented capabilities

- Account registration, sign-in and authenticated API access.
- Phone-first sign-in and phone-number registration screens, including international number formatting.
- A transitional sign-in route for existing email or username accounts.
- Password confirmation and visibility controls.
- SMS recovery using Twilio Verify and an explicitly verified recovery contact.
- API-backed personal debts, repayments, businesses and business transactions.
- Version-aware edits, duplicate-submit guards and conflict feedback.
- Automatic Frankfurter exchange rates, dated caches and estimated display totals.
- An expanded display-currency catalogue.
- Per-account device-local country and currency preferences.
- Account deletion with password verification and explicit confirmation.
- Native Android packaging with Capacitor.

Feature implementation does not imply that every concurrency, outage or production recovery scenario has been verified. The testing and roadmap sections identify remaining release work.

## Financial model

### Personal debts

A debt records a person, direction, principal, currency, purpose, optional due date, notes and repayment history.

| Direction | Meaning |
| --- | --- |
| `receivable` | Money owed to the account owner. |
| `payable` | Money the account owner owes. |

Multiple debts can be recorded for the same person. Each repayment has an ID, amount, date and optional notes.

```text
Outstanding debt = Principal − Recorded repayments
```

A separate contact directory, interest calculations and business-loan associations are not currently part of this model.

### Business capital

A business records its name, description, currency and transaction history. New businesses start with zero recorded capital; contributions and returns establish the balance.

| Transaction | Meaning |
| --- | --- |
| `contribution` | Capital put into the business. |
| `capital_return` | Previously contributed capital returned to its owner. |

```text
Capital still invested = Contributions − Capital returns
```

A capital return cannot exceed the remaining invested capital. Remaining invested capital is not a profit calculation or a current business valuation.

Business loans, profit distributions, sales, expenses, inventory and market valuations require separate future models.

### Money and consistency rules

- Stored debt and business currencies remain **USD and ZAR** in the current financial model. Supporting another display currency does not enable recording a debt in that currency.
- Financial amounts use Kotlin `Long`, PostgreSQL `BIGINT` and integer JSON values representing cents. For example, `100000` represents ZAR 1,000.00.
- Frontend inputs are converted to integer cents and checked for safe integer values.
- The supported amount limit in the existing model is `100000000000` cents. Cumulative business contributions are capped at the same limit.
- Repayments cannot exceed the outstanding balance. Principal cannot be reduced below repayments already recorded.
- A debt's currency and direction cannot change after a repayment. Business currency cannot change after its first transaction.
- Metadata edits require the current version. Repayments and business transactions also increment it.
- Writes lock the parent financial record before validating and recording transactions.
- Matching retries with the same transaction UUID do not create another transaction. Conflicting reuse of an ID returns a conflict.
- Financial transaction history is append-only through ordinary transaction APIs. Corrections and reversals are not implemented; permanent account deletion is a separate destructive workflow.

Debt and business creation do not currently have creation idempotency keys. If a creation response is lost, refresh the list before retrying. Transaction IDs retained by an open form do not survive a browser reload.

## Accounts and recovery

### Sign-in and ownership

Financial records belong to an immutable account UUID. Changing a sign-in identifier does not transfer records to another account.

The frontend uses phone-number registration and phone-first sign-in. A country-code selector allows local number entry before conversion to international format. Existing email or username users have a transitional sign-in route where that UI is retained.

Frontend input restrictions alone do not enforce phone-only registration at the API level. Complete backend enforcement and an existing-account migration policy before treating phone-only accounts as a system-wide guarantee.

Passwords accept **8–128 characters** for registration and password reset. Existing passwords continue to work. The application does not require a mandatory uppercase/symbol combination.

> Registration OTP and mandatory sign-in MFA are not implemented merely by configuring Twilio. Until those flows are added, a phone-number sign-in identifier is not proof that its ownership has been verified.

Sessions use bearer tokens. The current frontend keeps the session token in memory, so a full page refresh can require signing in again. Backend protected operations resolve the account and validate its authentication version; resetting a password invalidates older account tokens through that version.

### Identifier reuse

Active identifiers must remain unique. The identifier-reuse update releases the previous identifier when an account changes it and keeps separate change history.

Returning to a released identifier must still pass the normal uniqueness rules. Registering a fresh account with a released value creates a new account UUID and must not expose the previous owner's records. Identifier reuse is not proof of phone ownership; verification must be enforced by the appropriate account flow.

### SMS account recovery

Recovery uses **Twilio Verify**. The backend sends verification requests and checks the returned code; provider credentials remain server-side.

Initial setup:

1. Sign in with the current password.
2. Open Account and select **Set up SMS recovery**.
3. Enter a recovery phone in international format and the current password.
4. Request an SMS and enter the code.
5. After approval, the recovery phone is stored as verified.

Password reset:

1. Select **Forgot password?** on the sign-in screen.
2. Enter the account's current sign-in identifier.
3. Receive the code at the previously verified recovery phone.
4. Submit the code and a matching new password/confirmation.
5. Sign in again with the new password.

The response **“If eligible, recovery instructions will be sent”** deliberately does not reveal whether an account exists or has an eligible recovery contact. It is not confirmation of SMS delivery.

Registering with a phone number does not automatically enrol it for recovery. Never manually mark a recovery contact as verified to bypass the verification flow.

### Twilio configuration

Create or select a Verify service with SMS enabled. Its friendly name can be `LedgerNest`. Permit the destination countries required for launch and retain fraud controls. The Account SID, Auth Token and Verify Service SID must belong to the intended Twilio account.

Set these environment variables on the backend:

| Variable | Purpose |
| --- | --- |
| `RECOVERY_SMS_ENABLED` | Set to `true` to enable SMS recovery. |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID, beginning with `AC`. |
| `TWILIO_AUTH_TOKEN` | Private authentication credential. |
| `TWILIO_VERIFY_SERVICE_SID` | Verify service SID, beginning with `VA`. |

Save the variables and redeploy the backend. Twilio Verify provides the sending infrastructure; buying a separate Twilio number is not required for this integration.

For local development, provide these variables in the shell or your IDE's run configuration. A `.env` file is not automatically loaded unless your local tooling explicitly loads it. Never put credentials in frontend variables, tracked configuration or README examples.

SMS delivery and verification are billed by the provider. Set account spending controls appropriate to testing and expected usage.

### Recovery troubleshooting

| Symptom | Check |
| --- | --- |
| Generic recovery response but no SMS | Confirm the account has an SMS recovery contact in `ln_recovery_contact`. |
| No Twilio request visible | Confirm the enable flag, backend environment and application logs; delivery may have failed before reaching Twilio. |
| Provider HTTP `403`, code `21608` | Check destination verification restrictions and account compliance/upgrade status in Twilio. Confirm Render uses the intended account credentials. |
| Provider HTTP `403` for another reason | Inspect the actual provider error code; check Verify destination permissions and service/account configuration. |
| Code rejected | Check expiry, challenge purpose, attempt limits, and whether it was already used. |

Use Twilio's current error documentation and account console for the applicable restriction. Keep tokens, passwords, SMS codes and full recipient details out of shared logs.

### Account deletion

The deletion update adds an authenticated flow requiring the current password, the text `DELETE`, and final confirmation.

Public deletion request page:

[https://ledgernest-api.onrender.com/delete-account](https://ledgernest-api.onrender.com/delete-account)

This page is hosted by the backend and can be used without installing the mobile application. It verifies account credentials before deletion.

The implemented deletion flow targets the account and its live financial/recovery data in one database transaction, including identifier history supported by the deployed schema. It ends account access and releases the current identifier reservation. Review new tables or external integrations whenever the data model grows so deletion remains complete.

Deleting an account does not cancel real-world debts or business agreements. Hosting backups, provider records and infrastructure logs have separate retention policies; disclose the actual periods and any lawful exceptions in the Privacy Policy. Data already displayed on another device cannot be remotely erased by deleting the server account.

## Currency conversion

### Recording currency versus display currency

These are separate settings:

- **Record currency:** USD or ZAR, attached to a debt or business and its transactions.
- **Display currency:** a supported currency selected for estimated combined totals.

The expanded display selector includes a bundled currency catalogue and refreshes it from Frankfurter. The catalogue can change over time; a currency appearing in the catalogue does not guarantee a usable rate for every date or currency pair.

The selected default determines the initial display choice, not the full set of options offered to the user. The default preference logic suggests ZAR for South Africa and USD for Zimbabwe; users can choose their preferred display currency inside the application.

### Automatic rates

The frontend uses Frankfurter's public API:

```text
https://api.frankfurter.dev/v2/currencies
```

The rate integration requests the relevant rates for the supported record currencies and selected display currency. No Frankfurter API key is embedded in the application.

- Fetching rates does not rewrite principal, repayments or original record currencies.
- Converted totals are estimates, with the rate source and date shown.
- Cached rates may be reused with their date visible.
- If no usable rate exists, conversion is unavailable; the app must not silently assume a 1:1 rate or omit unconvertible records from a supposedly complete total.
- Display formatting accounts for differing currency decimal places.
- Reference rates can differ from bank, card, remittance or informal-market rates.

Currency preferences and rate caches are device/browser-local. Preferences are keyed by account UUID, but do not yet synchronise automatically across devices. The signup form does not require a separate country-of-residence question.

## Architecture

### Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Forms, workspace, local state and API integration. |
| Backend | Kotlin, Micronaut | Authentication, validation, ownership and financial rules. |
| Database access | JDBC and Micronaut `TransactionOperations<Connection>` | Parameterised SQL and transaction boundaries. |
| Database | PostgreSQL | Accounts, recovery challenges and financial records. |
| Migrations | Flyway | Versioned schema changes. |
| SMS verification | Twilio Verify | Sending and checking recovery OTPs. |
| Exchange rates | Frankfurter | Reference rates for estimated display conversion. |
| Android | Capacitor and Gradle | Native wrapper and Android resources. |
| Web hosting | Vercel | Frontend hosting and API routing. |
| API and database hosting | Render | Backend service and PostgreSQL. |
| Domain/DNS | Cloudflare-managed DNS | Custom website domain routing. |

### Production request paths

```text
Browser → https://ledgernest.co.za → Vercel frontend
Frontend /api/v1/... requests → configured proxy → Render Micronaut API
Render API → PostgreSQL
Render API → Twilio Verify for recovery verification
Frontend → Frankfurter for currencies and display rates
```

`ledgernest.co.za` is the public frontend address. The Render hostname remains the API host; adopting the website domain does not move the backend or database.

Browser requests use relative `/api/v1/...` URLs routed by the frontend hosting configuration. Local Vite proxies `/api` to `http://127.0.0.1:8080`.

A packaged native WebView has its own origin. Its API requests need the native routing/base-URL configuration used by the project; a Vercel rewrite cannot route requests made to a local Capacitor origin. Keep any native request interception/base URL consistent with the Render API, and permit the actual native origin in backend CORS.

### Repository structure

```text
LedgerNest/
├── README.md
├── backend/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── kotlin/com/ledgernest/       # Application entry point
│       ├── kotlin/ledgernest/
│       │   ├── controllers/
│       │   ├── models/
│       │   ├── repositories/
│       │   └── services/
│       └── resources/
│           ├── application.properties
│           ├── application-ledgerlocal.properties
│           ├── application-prod.properties
│           └── db/migration/
├── frontend/
│   ├── public/                          # Logos, favicon and static assets
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── models/
│   │   └── services/
│   ├── android/                         # Capacitor Android project
│   └── capacitor.config.*               # Actual extension depends on project
└── mobile/                              # Earlier reserved directory
```

Optional legal files, test bundles and setup guides depend on which updates have been installed. Native Android work belongs in `frontend/android/`; the older `mobile/` directory is not the active Android project.

### Persistent records

| Table | Purpose |
| --- | --- |
| `ln_user` | Account identity, password hash and authentication version. |
| `ln_identifier_registry` | Reservations supporting active sign-in identifier uniqueness. |
| `ln_debt` | Debt details, owner, currency, principal and version. |
| `ln_repayment` | Repayments against debts. |
| `ln_business` | Business details, owner, currency and version. |
| `ln_business_transaction` | Contributions and capital returns. |
| `ln_recovery_contact` | Verified account recovery destination. |
| `ln_recovery_challenge` | Purpose-bound recovery challenges and verification state. |
| `ln_recovery_limit` | Persisted recovery rate-limit buckets. |

The identifier-reuse update also adds change-history storage. Consult the applied migrations for its exact table name and deployed schema. Do not infer the database structure solely from an old README.

## Local development

### Prerequisites

- JDK **25** for the current backend configuration.
- The repository's Gradle wrapper.
- Node.js/npm compatible with the frontend package and lockfile.
- PostgreSQL, directly or through the repository's Docker Compose setup.
- JDK **21** and an Android SDK for the current Android build workflow.
- Android Studio for native project/resource management and emulator testing.

The backend and Android wrapper use different build environments. Do not downgrade the backend's source level simply because Android builds use Java 21.

### Start the backend

The existing `ledgerlocal` configuration targets `localhost:5433`, database `ledgernest`. Confirm the current values in `backend/src/main/resources/application-ledgerlocal.properties` before starting; local credentials are for development only.

From the repository root:

```bash
cd backend
./gradlew clean assemble
MICRONAUT_ENVIRONMENTS=ledgerlocal ./gradlew run
```

On macOS, when explicitly selecting Java 25:

```bash
JAVA_HOME="$(/usr/libexec/java_home -v 25)" \
  MICRONAUT_ENVIRONMENTS=ledgerlocal ./gradlew run
```

The local API listens on `http://localhost:8080` with the supplied configuration.

Flyway applies pending migrations automatically at backend startup when enabled. Preserve applied migration files; add new migrations rather than editing historical ones. Do not delete database volumes to fix an application configuration problem.

### Start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Use `npm install` if the project has no lockfile. Keep the local origin consistent when testing browser-local settings and previous records.

Build separately when preparing a deployment or native update:

```bash
npm run build
```

Run `npm run lint` if the script is defined in the current `package.json`.

### Authenticated API checks

Financial endpoints now require authentication. Calling them anonymously is not a valid empty-database smoke check.

Obtain a token through the application's login flow or an API client, then supply it as a bearer token. For example, in a shell where `LEDGERNEST_ACCESS_TOKEN` already contains a short-lived development token:

```bash
curl -i http://localhost:8080/api/v1/debts \
  -H "Authorization: Bearer ${LEDGERNEST_ACCESS_TOKEN}"

curl -i http://localhost:8080/api/v1/businesses \
  -H "Authorization: Bearer ${LEDGERNEST_ACCESS_TOKEN}"
```

Both return arrays; `[]` is valid for an authenticated account with no records. Use disposable local credentials and keep tokens out of screenshots, scripts committed to Git and shared logs.

## API overview

### Accounts and recovery

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Register an account. |
| POST | `/api/v1/auth/login` | Authenticate and obtain a session token. |
| GET | `/api/v1/auth/me` | Retrieve the current authenticated account. |
| PUT | `/api/v1/auth/username` | Change sign-in identifier after password verification. |
| POST | `/api/v1/auth/recovery/enroll` | Start verification of a recovery contact while signed in. |
| POST | `/api/v1/auth/recovery/start` | Request recovery using an eligible verified contact. |
| POST | `/api/v1/auth/recovery/finish` | Complete enrolment or password reset with a valid challenge. |
| POST | `/api/v1/auth/delete-account` | Permanently delete the authenticated account after confirmation. |
| GET | `/delete-account` | Public browser account-deletion page. |

Authentication requirements depend on the action: enrolment, identifier changes and direct account deletion require a signed-in account; login, registration and recovery initiation are public routes with validation and rate limits. Recovery completion validates its own challenge and purpose.

### Financial records

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET / POST | `/api/v1/debts` | List / create debts. |
| GET / PUT | `/api/v1/debts/{id}` | Retrieve / edit a debt. |
| POST | `/api/v1/debts/{id}/repayments` | Record a repayment. |
| GET / POST | `/api/v1/businesses` | List / create businesses. |
| GET / PUT | `/api/v1/businesses/{id}` | Retrieve / edit a business. |
| POST | `/api/v1/businesses/{id}/transactions` | Record a contribution or capital return. |

Financial list endpoints accept `limit` from 1–100 and a non-negative `offset`. The frontend follows pages to calculate totals across records.

Use the controller/request models in the current repository as the authoritative API contract. This table does not replace request validation or exhaustive response documentation.

## Deployment

### Frontend: Vercel and the custom domain

The public website is [https://ledgernest.co.za](https://ledgernest.co.za). The underlying Vercel deployment also has its provider address:

[https://ledger-nest-rosy.vercel.app](https://ledger-nest-rosy.vercel.app)

The frontend project uses the `frontend/` directory, its build command and generated `dist/` output. Keep the Vercel API proxy/rewrite pointed at the Render backend.

Configure the custom domain in Vercel, then use the DNS records Vercel specifies in Cloudflare. The API hostname is not the target for hosting the React site. Confirm HTTPS and the intended apex/`www` behaviour after DNS changes.

After frontend source changes, build and deploy the frontend. Building locally does not update a live Vercel deployment or an installed Android application.

### Backend: Render

The backend remains at:

[https://ledgernest-api.onrender.com](https://ledgernest-api.onrender.com)

Core production variables used by the existing configuration include:

| Variable | Purpose |
| --- | --- |
| `MICRONAUT_ENVIRONMENTS` | Select `prod` for production configuration. |
| `JDBC_DATABASE_URL` | PostgreSQL JDBC URL, in `jdbc:postgresql://...` form. |
| `DB_USERNAME` | Database username. |
| `DB_PASSWORD` | Database password. |
| `PORT` | HTTP listening port supplied by Render. |
| `RECOVERY_SMS_ENABLED` | SMS recovery enable flag. |
| `TWILIO_ACCOUNT_SID` | Twilio account. |
| `TWILIO_AUTH_TOKEN` | Twilio credential. |
| `TWILIO_VERIFY_SERVICE_SID` | Verify service. |

Retain the existing JWT signing-secret configuration and any other required environment variables already used by the deployed application. This table is not an instruction to replace the environment wholesale or rotate signing keys during routine deployment.

Production binds to `0.0.0.0` and Render's supplied port. Flyway validates and applies migrations during startup when enabled. Deploy backend changes and required migrations before releasing a frontend that depends on them.

SMS-only recovery does not need an email provider. If enabling the optional email recovery integration, configure its separate enable flag, provider credentials, verified sender and frontend recovery URL. Use `https://ledgernest.co.za` as that frontend URL once the custom domain is active.

### Operational checks

- Confirm the backend is Live and its startup logs report successful database initialisation.
- Confirm Flyway validation succeeds and the expected schema version is applied.
- Exercise sign-in, a financial read/write and SMS recovery after relevant releases.
- Review provider errors using their codes without logging secrets or OTPs.
- Maintain backups and test restoration using an isolated database.

Database upgrades can interrupt connections. A connection timeout followed by a successful pool start and server startup indicates recovery for that instance; it does not prove all later requests succeeded. Investigate persistent failures rather than increasing timeouts blindly.

## Android development

The Android application is a Capacitor wrapper around the built frontend.

### Update an existing Android build

From the repository root:

```bash
cd frontend
npm ci
npm run build
npx cap sync android
```

To build an APK:

```bash
cd android
JAVA_HOME="$(/usr/libexec/java_home -v 21)" ./gradlew assembleDebug
```

Output, relative to the repository root:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer the APK to the phone and install it as an update, or install directly with a connected authorised device:

```bash
JAVA_HOME="$(/usr/libexec/java_home -v 21)" ./gradlew installDebug
```

`assembleDebug` builds; `installDebug` builds and installs. A connected device or running emulator is required for installation. Reuse the existing application ID and signing key when updating an installed app.

### Open Android Studio

Run Capacitor commands from `frontend/`:

```bash
npx cap open android
```

Run `./gradlew` commands from `frontend/android/`. If Capacitor reports that Android has not been added, first check the working directory and whether `frontend/android/` exists. Do not recreate an existing native project merely because the command was run from the wrong directory.

### App name and icons

These assets are independent:

| Asset | Configuration |
| --- | --- |
| Browser tab title | `<title>` in `frontend/index.html`. |
| Browser favicon | Icon link in `frontend/index.html` and the corresponding file in `frontend/public/`. |
| Installed web-app name/icons | Web app manifest, where configured. |
| Android display name | `frontend/android/app/src/main/res/values/strings.xml`. |
| Android launcher icon | `mipmap-*` resources and adaptive launcher XML under Android `res/`. |
| Login/in-app logo | Frontend image assets and React components. |

Update Android launcher assets through Android Studio's **Image Asset** workflow, using the symbol alone for small-size clarity. Make sure adaptive icon XML references the resource type actually generated, such as `@mipmap/ic_launcher_foreground` for PNGs in `mipmap-*`. Rebuild and install the APK to see native asset changes.

Changing a favicon does not update the Android launcher icon. Avoid duplicate `app_name` resources and malformed launcher XML.

### Release distribution

Debug APKs are for development testing. A Google Play release needs a signed release bundle, store setup, appropriate disclosures and the testing/review steps applicable to the developer account. iOS requires a separately configured Capacitor iOS project and Apple's build/distribution tooling. Neither store release is represented as complete here.

## Data integrity and security

- Authenticated accounts own their records through account UUIDs.
- Ownership checks must apply to every protected operation; trusting a valid JWT alone is insufficient after deletion or authentication-version changes.
- Passwords are hashed; credentials and OTPs must not be logged.
- Recovery challenges are purpose-bound, expiring, attempt-limited and single-use on successful completion.
- Backend validation and database constraints protect financial rules and active identifier uniqueness.
- SQL uses parameters for user-supplied values.
- Transaction IDs and version checks address retries and concurrent edits.
- HTTPS, database access controls, CORS, secrets management and provider permissions remain deployment responsibilities.

Never commit real credentials, keystores, private keys, production database dumps or personal financial exports. Keep generated patches and backup folders out of ordinary source commits unless deliberately maintained as project documentation.

### Existing browser records

Earlier browser-only records may remain in `ledgernest.v1.personal` and appear in read-only legacy sections. They are not automatically imported into the authenticated backend and do not contribute to backend totals.

Such legacy browser data may predate account ownership. Treat it as device-local information, especially on shared devices. Review before recreating records to avoid duplicates. Clearing browser site data removes local preferences, caches and legacy records, but does not delete the backend account.

Recent activity is not a complete server audit trail of every creation or metadata edit.

## Testing

### Backend

From `backend/`, using Java 25:

```bash
./gradlew test
./gradlew assemble
```

Use a disposable PostgreSQL database for integration, concurrency and destructive deletion tests. Never point a smoke script that creates test balances at production.

The earlier `scripts/smoke-businesses.py` script, if retained, was written during the local integration phase. Check its authentication support and target URL before running it against the current API.

### Frontend

From `frontend/`:

```bash
npm ci
npm run build
```

If the earlier optional `country-currency-tests/` Vitest harness is installed:

```bash
npx vitest run --config country-currency-tests/vitest.config.mjs
```

Use the test commands and dependency versions defined by the current repository. Historical patch-bundle test counts are not proof that the current deployed commit passed.

### Release acceptance scenarios

- Registration validation and sign-in, including wrong credentials and duplicate identifiers.
- Recovery enrolment, correct/wrong codes, expiry, reused codes and a full password reset.
- Password reset invalidating older sessions.
- Account deletion, released identifiers and isolation of other accounts' records.
- Debt creation, partial/full repayments, conflicts and repeated requests.
- Business creation, contributions, returns and excessive-return rejection.
- Display-currency changes, unavailable rates, cached rates and currency decimal formatting.
- Android layout, keyboard behaviour, native API routing and updated app resources.
- Cross-account access rejection and persistence across application/database restarts.

## Roadmap

### Established foundation

- [x] Kotlin/Micronaut API and React/Vite frontend.
- [x] PostgreSQL persistence and Flyway migrations.
- [x] Personal debts and repayments.
- [x] Business contributions, capital returns and derived balances implemented.
- [x] Account registration, sign-in and authenticated ownership.
- [x] SMS recovery verified end to end by the project owner.
- [x] Automatic display conversion and expanded display-currency selection.
- [x] Account-deletion flow implemented.
- [x] Website deployed using `ledgernest.co.za`.
- [x] Android development packaging through Capacitor.

### Before broader release

- [ ] Enforce and verify phone-only registration in the backend.
- [ ] Add registration OTP verification and a verified-number-change flow.
- [ ] Implement mandatory sign-in MFA and a recovery strategy for lost phones.
- [ ] Complete production acceptance testing of business and concurrency workflows.
- [ ] Review account isolation, token lifecycle, deletion and abuse controls.
- [ ] Publish reviewed Terms and Privacy Policy reflecting actual operation and retention.
- [ ] Store accepted Terms version and timestamp server-side and enforce acceptance.
- [ ] Audit third-party licence and attribution requirements.
- [ ] Establish CI checks, monitoring, backup restoration and release procedures.
- [ ] Complete accessibility testing and native release testing.
- [ ] Prepare signed Android release distribution and store review.

### Future expansion

- [ ] Record debts and businesses in currencies beyond USD/ZAR, with appropriate minor-unit handling.
- [ ] Synchronise account preferences across devices.
- [ ] Record export and explicit migration/import of previous browser records.
- [ ] Transaction correction and reversal workflows.
- [ ] Contacts, due-date reporting, reminders and receipt attachments.
- [ ] Business loans and profit distributions as separate models.
- [ ] Historical exchange-rate policies and reporting.
- [ ] Offline functionality and iOS packaging/testing.

Roadmap items are planned work, not promises of delivery dates.

## Licence and legal documents

**Copyright © 2026 Molisa Moyo. All rights reserved.**

LedgerNest's original work is intended to be distributed under a **proprietary licence**. Access to the repository does not grant permission to copy, modify, redistribute, sublicense or sell its proprietary materials. Refer to the root `LICENSE` notice when installed. Third-party components remain governed by their respective licences.

The proprietary legal bundle provides a root licence notice, draft Terms and Conditions, in-app Terms links and a public `/terms` backend route. Confirm those files are installed and operator details are completed before treating the legal pages as published.

- Public account deletion: [https://ledgernest-api.onrender.com/delete-account](https://ledgernest-api.onrender.com/delete-account).
- Terms page, after the legal bundle is configured and deployed: `https://ledgernest-api.onrender.com/terms`.
- Privacy Policy: publish and link the actual policy before public store submission.

The initial Terms checkbox is a frontend check; durable server-side acceptance records and existing-account acceptance handling remain work to complete. The Privacy Policy is a separate document and is not supplied by the Terms bundle.

LedgerNest records information supplied by users. It does not hold money, collect debts, prove an agreement or provide personalised financial or legal advice.

## Project philosophy

- **Simplicity:** Make recording a debt, repayment or contribution straightforward.
- **Transparency:** Show the transactions behind each balance.
- **Privacy:** Keep accounts and financial records isolated.
- **Accuracy:** Handle amounts, currencies and retries consistently.
- **Sustainable scope:** Complete and verify useful workflows before expanding them.

Component-specific build and operational details belong in `backend/README.md` and `frontend/README.md`. Keep those guides, applied migrations and the root README aligned with the deployed source.
