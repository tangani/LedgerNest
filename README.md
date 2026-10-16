# 🪺 LedgerNest

LedgerNest is a personal debt and business capital tracker built to answer three questions: **Who do I owe? Who owes me? How much money have I put into my businesses, and what has come back?**

The application consists of:

* 🌐 React + TypeScript frontend, built with Vite
* ⚙️ Kotlin + Micronaut backend APIs
* 🗄️ PostgreSQL persistence with Flyway migrations
* 📱 Mobile-first web layouts, with native mobile delivery planned

> **Status — 16 October 2026:** Personal debts work end to end, including repayments and persistence after restarting the backend. Business APIs and frontend integration have been implemented; the Business list endpoint has been verified locally, while the complete live contribution/return workflow still needs verification. Authentication and public deployment are outstanding.

---

# 🎯 Vision

Money lent to friends, money borrowed, and contributions to small businesses can be difficult to track across messages, receipts and spreadsheets.

LedgerNest brings these records into one application while keeping personal debt and business capital separate. The initial focus is a useful personal tool, with a foundation that can later support other users.

The interface has three main tabs:

1. **Personal debts** — Owed to me and I owe
2. **Business** — Contributions, returned capital and remaining invested capital
3. **Recent activity** — Repayments and business transactions, alongside previous local activity

---

# 💡 Financial Model

## Money I Owe / Money Owed to Me

A debt records a person's name, direction, original amount, currency, purpose, optional due date, notes and repayments.

* `receivable` means money owed to me.
* `payable` means money I owe.
* Multiple debts may be recorded for the same person.
* Each repayment has an ID, amount, date and optional notes.
* Outstanding balances are derived from principal and repayment history.

There is currently no separate contact directory, borrowing/lending date field, interest calculation or business-loan association.

## Business Capital

A business records its name, description, currency and transaction history. New businesses start with zero capital; funds are recorded through transactions.

Supported transaction types:

* **Contribution** (`contribution`) — Funds put into the business
* **Capital return** (`capital_return`) — Contributed capital returned to the owner

The application calculates total contributed, total returned and capital still invested. A capital return cannot exceed the remaining invested capital.

Business loans, profit distributions, sales, expenses, inventory and current business valuations are not implemented. Remaining invested capital is not a measure of profit or market value.

## Currency and Display Totals

ZAR and USD are supported. Every debt or business retains its original currency, and its transactions use that currency.

Users can select a display currency and enter a manual ZAR-per-USD exchange rate. Converted totals are estimates for display; conversion does not rewrite stored amounts. Combined totals that require a missing rate show that a rate is needed.

Automatic exchange-rate retrieval and historical exchange rates are not implemented.

---

# 🚀 Current Status

## Verified Locally

* Personal-debt creation and retrieval
* Partial repayment recording and updated outstanding balances
* Debt persistence after backend restart
* Personal-debt frontend/API integration, confirmed working
* Business list endpoint returning `200 OK`

## Implemented; Live Verification Pending

* Business frontend/API integration for creation, editing, contributions and capital returns
* Business history and combined Recent activity
* Business persistence across browser refresh and backend restart
* Business concurrency and retry checks against the running database

Frontend type-checking and simulated API checks have covered both debt and business flows. These checks do not replace the local production build, lint checks or live database/API verification.

---

# ✅ Implemented Features

## Frontend

* React, TypeScript and Vite application
* Mobile-first tabs, compact cards and modal editors
* API-backed personal debt and business workflows
* Loading, empty, error and manual refresh states
* Version-aware editing and conflict messages
* Duplicate-submit guards and stable transaction IDs for retries within an open form
* Transaction history and Recent activity
* Manual currency conversion for display totals
* Read-only access to previous browser-stored debts and businesses

## Backend

* Kotlin/Micronaut application with controllers, models, services and repositories
* Debt and Business REST APIs
* PostgreSQL tables and versioned Flyway migrations
* Integer-cent money validation and derived balances
* Managed JDBC transactions through Micronaut `TransactionOperations<Connection>`
* Row locking for writes and version checks for metadata edits
* Idempotent repayment and business transaction requests using client-supplied UUIDs
* A Business API smoke-test script

## Infrastructure

* GitHub repository: [tangani/LedgerNest](https://github.com/tangani/LedgerNest)
* Separate `backend/` and `frontend/` projects in one repository
* Local PostgreSQL configuration and an explicit `ledgerlocal` backend environment
* Reserved `mobile/` directory for future work

---

# 🏗️ Architecture

## Technology Stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Forms, cards, state and API integration |
| Backend | Kotlin, Micronaut | HTTP APIs, validation and business rules |
| Database access | JDBC with Micronaut-managed transactions | Parameterized SQL and transaction boundaries |
| Database | PostgreSQL | Persistent debt and business records |
| Migrations | Flyway | Versioned schema changes |
| Local infrastructure | Docker Compose | Local database environment |
| Mobile | To be decided | Future packaged mobile application |

The frontend calls relative `/api/v1/...` URLs. During development, Vite proxies `/api` to `http://127.0.0.1:8080`. Production hosting will need an equivalent API routing arrangement.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `backend/src/main/kotlin/com/ledgernest/` | Application entry point |
| `backend/src/main/kotlin/ledgernest/controllers/` | HTTP routes and responses |
| `backend/src/main/kotlin/ledgernest/models/` | Request and response models |
| `backend/src/main/kotlin/ledgernest/services/` | Validation and financial rules |
| `backend/src/main/kotlin/ledgernest/repositories/` | SQL and transaction management |
| `backend/src/main/resources/db/migration/` | Flyway SQL migrations |
| `backend/scripts/` | Local API smoke checks |
| `frontend/src/features/` | Debt, business and activity components |
| `frontend/src/components/` | Shared UI components |
| `frontend/src/hooks/` | API loading and mutation state |
| `frontend/src/services/` | HTTP transport and API adapters |
| `frontend/src/models/` | TypeScript domain types |
| `frontend/src/lib/` | Money, validation and browser-storage helpers |
| `mobile/` | Reserved for future mobile work |

## Current Persistent Records

| Table | Purpose |
| --- | --- |
| `ln_debt` | Personal debt details, currency, principal and version |
| `ln_repayment` | Dated repayments against debts |
| `ln_business` | Business details, currency and version |
| `ln_business_transaction` | Contributions and capital returns |

There is no implemented user-account or contact model yet. Both services currently use the same fixed local owner ID.

---

# 💵 Calculation and Consistency Rules

```text
Outstanding debt = Original amount − Recorded repayments
Capital still invested = Contributions − Capital returns
```

* Monetary amounts use Kotlin `Long`, PostgreSQL `BIGINT`, and integer JSON numbers representing cents. For example, `100000` represents R1,000.00 for a ZAR record.
* Frontend inputs are converted to integer cents and checked for safe integer values. This implementation does not use decimal strings, `BigDecimal` or `NUMERIC` for stored money.
* The current supported amount limit is `100000000000` cents. Business cumulative contributions are capped at the same limit.
* Repayments cannot exceed the debt balance; debt principal cannot be reduced below recorded repayments.
* Currency and direction cannot change after a debt repayment. Business currency cannot change after its first transaction.
* Metadata updates require the current version. New repayments and business transactions also increment that version.
* Matching retries of a transaction ID do not record another transaction. Reusing an ID with conflicting details returns a conflict.
* Write transactions lock the parent debt or business before validating and recording money movements.
* Transaction history is append-only through the current APIs. Transaction corrections, reversals and deletion are not implemented.

Creation of a debt or business does not yet have an idempotency key. If its response is lost, refresh the list before attempting creation again. Transaction retry IDs are retained within the open frontend form, not across a browser reload.

---

# 🛠️ Local Development

## Prerequisites

* A JDK compatible with the backend's Java 25 configuration
* The repository's Gradle wrapper
* Node.js and npm compatible with the versions in the frontend package and lockfile
* PostgreSQL running with the local database configuration, directly or through the project's Docker Compose setup

The current `ledgerlocal` database configuration targets `localhost:5433`, database `ledgernest`. Connection settings are in `backend/src/main/resources/application-ledgerlocal.properties`; the supplied credentials are for local development only.

## Start the Backend

From the repository root:

```bash
cd backend
./gradlew clean assemble
MICRONAUT_ENVIRONMENTS=ledgerlocal ./gradlew run
```

Flyway applies pending migrations on startup. Preserve already-applied migration files and database volumes when installing updates.

## Start the Frontend

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run build
npm run lint
npm run dev
```

Use `npm install` if no lockfile exists yet. Open `http://localhost:5173`. The supplied Vite configuration uses a strict port so it does not silently switch to a different browser-storage origin.

## Check the APIs

```bash
curl -i http://localhost:8080/api/v1/debts
curl -i http://localhost:8080/api/v1/businesses
```

Both return arrays; `[]` is valid when no records exist.

## API Summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET / POST | `/api/v1/debts` | List / create debts |
| GET / PUT | `/api/v1/debts/{id}` | Retrieve / edit a debt |
| POST | `/api/v1/debts/{id}/repayments` | Record a repayment |
| GET / POST | `/api/v1/businesses` | List / create businesses |
| GET / PUT | `/api/v1/businesses/{id}` | Retrieve / edit a business |
| POST | `/api/v1/businesses/{id}/transactions` | Record a contribution or capital return |

List endpoints accept `limit` (1–100) and a non-negative `offset`. The frontend follows pages to calculate totals across the returned records.

## Business Smoke Checks

With the local backend running, from `backend/`:

```bash
python3 scripts/smoke-businesses.py
```

The script creates and retains two named test businesses. One tests the maximum supported contribution, so it adds a large test balance. Run it against a development database. It checks validation, versions, idempotency, concurrent returns, duplicate transactions and rollback behavior.

---

# 🗃️ Existing Browser Records

New debt and business records are saved through the APIs. Earlier local records remain in `ledgernest.v1.personal` and are shown in expandable read-only sections.

They are not automatically imported and do not contribute to backend totals. Review them before recreating records to avoid duplication. Exchange-rate settings and previous local activity still live in browser storage. Clearing site data removes these local records and settings, but does not delete backend records.

Recent activity combines backend repayments and business transactions with saved local activity. It is not yet a complete backend audit trail for creation and edits.

---

# 🗺️ Development Roadmap

## Phase 1 — Foundations

* [x] Initialise repository and push to GitHub
* [x] Generate Kotlin/Micronaut backend and React/TypeScript frontend
* [x] Configure PostgreSQL and Flyway
* [x] Connect frontend to backend through the development proxy

## Phase 2 — Personal Debts

* [x] Record borrowing and lending
* [x] Record repayments and calculate outstanding balances
* [x] Edit debt details with version checks
* [x] Display repayment history
* [x] Verify persistence across backend restart
* [ ] Run comprehensive live concurrency and failure-recovery tests

## Phase 3 — Business Capital

* [x] Implement business APIs and database migration
* [x] Implement contributions, capital returns and derived totals
* [x] Connect Business forms, cards and history to the APIs
* [x] Include business transactions in Recent activity
* [ ] Verify the full live frontend → API → database workflow
* [ ] Verify persistence, concurrency and retry behavior against PostgreSQL

## Phase 4 — Authentication and Ownership

* [ ] Select and implement the authentication approach
* [ ] Add account access and session handling
* [ ] Replace the fixed local owner with authenticated identity
* [ ] Protect backend APIs and frontend routes
* [ ] Test that users cannot read or modify each other's records
* [ ] Make browser-stored settings and any retained local records account-aware

## Phase 5 — Reliability and Release

* [ ] Add CI build, lint and automated test checks
* [ ] Add an explicit migration/import flow for previous browser records
* [ ] Add record export and transaction correction/reversal workflows
* [ ] Configure deployment environments, secrets and HTTPS
* [ ] Configure database backups and test restoration
* [ ] Add operational logging and monitoring
* [ ] Complete mobile usability and accessibility checks
* [ ] Choose a mobile packaging approach and prepare release testing

## Future Expansion

* [ ] Separate contacts and richer due-date reporting
* [ ] Business loans linked to the debt module
* [ ] Profit distributions tracked separately from returned capital
* [ ] Automatic exchange rates and historical conversion policies
* [ ] Filtering, monthly reports, reminders and receipt attachments
* [ ] Offline access and mobile distribution

These are planned capabilities, not features already available.

---

# 🔐 Security

Request validation, version checks, transaction safeguards and owner-scoped database queries are implemented. **Authentication and multi-user isolation are not yet complete:** the `ledgerlocal` services currently use a fixed owner ID.

The local backend binds to `127.0.0.1`. Keep it local until authenticated ownership and deployment controls are implemented. A mobile-first website is not yet a packaged Android application or a Google Play release.

Deployment work must include appropriate authentication, HTTPS, secrets management and database access controls. Logs should exclude passwords, tokens and unnecessary financial or contact details. Never commit real credentials or database dumps containing personal records.

---

# 💡 Why LedgerNest Exists

Personal debts and small-business contributions often come from the same pocket but live in different places.

LedgerNest brings them together while preserving their different meanings: repayment obligations, outstanding balances, money invested and capital returned.

---

# 🌱 Project Philosophy

* **Simplicity:** Make recording a debt, repayment or contribution straightforward.
* **Transparency:** Show the transactions behind each balance.
* **Privacy:** Build towards authenticated, isolated ownership of records.
* **Accuracy:** Handle amounts, currencies and retries consistently.
* **Sustainable scope:** Complete one useful workflow at a time.

---

# 📚 Documentation

This root README describes the overall project. Component-specific instructions belong in `backend/README.md` and `frontend/README.md`.

The integration packages also include:

* `README-BUSINESS-API.md` — Business API contract, installation and curl examples
* `README-BUSINESS-FRONTEND.md` — Business frontend installation and live verification
* `README-INTEGRATION.md` — Personal-debt frontend integration notes

Keep relevant guides with the corresponding component when applying an update.

---

# 📄 License

No software license has been selected yet. Add a license file when the licensing approach is decided.

LedgerNest is under active development and is not yet ready for public use.

© 2026 LedgerNest
