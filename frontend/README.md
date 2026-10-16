# 🪺 LedgerNest Frontend

LedgerNest helps users track **money they owe, money owed to them, and capital contributed to businesses or side projects**.

This directory contains the mobile-first React and TypeScript web application. It belongs to the LedgerNest monorepo alongside the Kotlin/Micronaut backend.

> **Status — 16 October 2026:** Personal debts are connected to the backend and confirmed working locally. Business API integration is implemented, including contributions, capital returns and history; its full live workflow still needs verification. Authentication and public deployment are outstanding.

---

## Vision

Make personal lending, borrowing and business contributions easy to record and understand, while preserving their different financial meanings.

The interface groups information into three tabs to keep each workflow focused:

* **Personal debts:** Owed to me and I owe
* **Business:** Contributions, capital returns and remaining invested capital
* **Recent activity:** Repayments and business transactions, alongside previous local activity

---

## Current Features

### Personal Debts

* Add and edit debts in either direction
* Record a person's name, purpose, original amount, currency, optional due date and notes
* Record partial and full repayments
* Display outstanding balances, settled debts and repayment history
* Load and save records through backend APIs
* Include the current version when editing to detect conflicting changes

There is no separate contact directory, borrowing/lending date field, interest calculation or overdue reporting workflow yet.

### Business Capital

* Create businesses and edit their details
* Record capital contributions and returned capital
* Display contributed, returned and remaining invested amounts
* View dated transaction history
* Load and save records through backend APIs
* Lock business currency after the first transaction

New businesses start with zero capital. Add funds through the contribution form. Capital returns cannot exceed the amount still invested.

Business loans, distributions, sales, expenses, inventory and profit reporting are not implemented. Remaining invested capital is not current business value or profit. Recording funds does not transfer money.

### Shared Interface

* Mobile-first layouts, compact cards and modal editors
* Loading, empty, validation-error and network-error states
* Manual refresh controls for debts and businesses
* Duplicate-submit prevention and transaction retry handling
* ZAR and USD support
* Manual exchange-rate entry and display-currency conversion
* Read-only access to previous browser-stored debts and businesses

### Recent Activity

Recent activity combines backend repayments, business contributions and capital returns with previously stored local activity. Creation and edit events are not supplied by the current APIs, so this is not a complete backend audit trail.

---

## Planned Features

* Authentication, account access and protected routes
* Authenticated ownership and account-aware local settings
* Explicit import of previous browser records
* Transaction correction/reversal workflows
* Contact management, due-date reporting and history filters
* Export and monthly summaries
* Business loans and distributions as distinct workflows
* Automatic exchange-rate retrieval and historical conversion policies
* Reminders, receipt attachments and offline access
* Packaged mobile delivery

A mobile-first web interface is implemented; an Android package or Google Play release is not.

---

## Technology Stack

| Technology | Declared version range | Purpose |
| --- | --- | --- |
| React / React DOM | `^19.2.8` | User interface |
| TypeScript | `~6.0.2` | Static typing |
| Vite | `^8.3.0` | Development server and production assets |
| Vite React plugin | `^6.1.1` | React integration |
| ESLint | `^10.10.0` | Linting |
| CSS | — | Responsive styling |
| Browser Fetch API | — | HTTP requests |

These ranges reflect the supplied `package.json`. The repository's `package.json` and `package-lock.json` remain authoritative.

The application uses React state and custom hooks for data loading, native dialog elements for editors, and tab navigation. It does not currently require a routing or data-fetching library.

The backend uses Kotlin/Micronaut, Java 25, PostgreSQL, Flyway, and JDBC with Micronaut-managed transactions. Debt and business records are persisted in PostgreSQL.

---

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/main.tsx` | Application entry point |
| `src/App.tsx` | Workspace tabs, editors and integration between features |
| `src/App.css`, `src/index.css` | Application and global styles |
| `src/components/` | Shared tabs, modal, exchange-rate editor and converted amounts |
| `src/features/debts/` | Debt cards, metadata editor and repayment editor |
| `src/features/business/` | Business cards, metadata editor and funds editor |
| `src/features/activity/` | Recent activity display |
| `src/hooks/useDebts.ts` | Debt loading, refresh and mutation state |
| `src/hooks/useBusinesses.ts` | Business loading, refresh and mutation state |
| `src/services/http.ts` | Shared HTTP transport, timeout and error handling |
| `src/services/debtsApi.ts` | Debt requests and response normalization |
| `src/services/businessesApi.ts` | Business requests and response normalization |
| `src/models/ledger.ts` | Shared TypeScript domain types |
| `src/lib/` | Money, date, validation, conversion and storage helpers |
| `src/assets/`, `public/` | Static assets |
| `vite.config.ts` | React plugin and local API proxy |
| `tsconfig*.json` | TypeScript configuration |
| `eslint.config.js` | Lint configuration |
| `package.json`, `package-lock.json` | Scripts, dependencies and resolved versions |

Keep API calls in services, loading/mutation state in hooks, and feature-specific forms and displays in their feature folders.

---

## Money and Currency

Amounts are stored and sent as **integer cents**, not decimal strings. An input of `1000.00` becomes `100000` in the API request.

```text
Outstanding debt = Principal − Repayments
Capital still invested = Contributions − Capital returns
```

* Each debt or business retains its original currency, ZAR or USD.
* Repayments and business transactions use their parent record's currency.
* Changing the display currency only changes display calculations.
* A manually entered ZAR-per-USD rate supports estimated combined totals.
* When conversion is necessary but no rate is set, the interface asks for a rate.
* Debt currency and direction are locked after a repayment; business currency is locked after a transaction.
* Frontend validation improves feedback; the backend independently enforces the financial rules.

---

## API Integration

Requests use relative `/api/v1/...` paths. Vite proxies `/api` to `http://127.0.0.1:8080` during development.

| Method | Endpoint | Frontend workflow |
| --- | --- | --- |
| GET / POST | `/api/v1/debts` | Load / add debts |
| PUT | `/api/v1/debts/{id}` | Edit debt details with the current version |
| POST | `/api/v1/debts/{id}/repayments` | Record repayments |
| GET / POST | `/api/v1/businesses` | Load / add businesses |
| PUT | `/api/v1/businesses/{id}` | Edit business details with the current version |
| POST | `/api/v1/businesses/{id}/transactions` | Record contributions or capital returns |

The backend also provides GET-by-ID endpoints. Current list responses include transaction history. The frontend follows limit/offset pages and normalizes omitted empty fields, such as transaction arrays.

### Saves, Conflicts and Retries

* Forms wait for successful backend responses before updating balances or announcing success.
* Buttons prevent duplicate submission while a write is in progress.
* Metadata updates send the version captured when the form opened. A conflict asks the user to close, refresh and reopen the editor.
* Retrying a repayment or business transaction within the same dialog reuses its UUID and payload.
* Pending transaction IDs are not retained across browser reloads. After an uncertain result followed by closing or reloading, check history before recording another transaction.
* Debt and business creation do not yet have backend idempotency keys. After an uncertain create response, the form blocks another submission and asks the user to refresh the list first.
* Writes are not automatically retried.

---

## Data Persistence

New debts, repayments, businesses and business transactions are saved in PostgreSQL through the backend.

Earlier browser records remain under `ledgernest.v1.personal` and appear in expandable read-only sections. They are not automatically imported or included in backend totals. Review them before recreating records to avoid duplication.

Exchange-rate settings and previous local activity still use browser storage. Clearing site data removes those local settings and records, but does not delete backend data. Continue using the same browser origin to access the existing local archive.

---

## Getting Started

### Prerequisites

* Node.js and npm compatible with the versions resolved in this project's lockfile
* Git
* The LedgerNest backend and its local PostgreSQL database

Node.js `22.17.1` and npm `10.9.2` were reported during initial setup; they are not a declared minimum compatibility guarantee for future dependency updates. Check dependency engine requirements when updating packages.

### Installation

```bash
cd ~/Documents/projects/LedgerNest/frontend
npm ci
```

Use `npm install` if no lockfile exists yet, then commit the generated lockfile.

For a new checkout:

```bash
git clone https://github.com/tangani/LedgerNest.git
cd LedgerNest/frontend
npm ci
```

### Start the Backend

In a separate terminal:

```bash
cd ~/Documents/projects/LedgerNest/backend
MICRONAUT_ENVIRONMENTS=ledgerlocal ./gradlew run
```

The local database must be running. Its configuration is in `backend/src/main/resources/application-ledgerlocal.properties`.

### Start the Frontend

```bash
npm run dev
```

Open `http://localhost:5173`. The supplied Vite configuration uses `strictPort: true`: it reports an occupied port rather than switching to another browser-storage origin. Stop an older Vite process if necessary. Restart Vite after changing its configuration.

The application shell can render without the backend, but API-backed debt and business workflows require it. Backend failures appear as errors with refresh controls.

### Build and Lint

```bash
npm run build
npm run lint
```

The build runs TypeScript checks and generates assets in `dist/`.

### Preview

```bash
npm run preview
```

Use the URL printed in the terminal. Preview serves the built assets locally; it is not production hosting. Verify API forwarding in that mode. Deployed assets require hosting that routes `/api` to the backend; the development proxy is not embedded into the build.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Run TypeScript build checks and create production assets |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production assets locally |

The supplied package does not yet define a `start` or automated `test` script.

---

## Verification

### Personal Debts

1. Add a ZAR debt of R1,000 under Owed to me.
2. Record a R250 repayment.
3. Confirm R750 outstanding and the repayment in Details.
4. Refresh the browser and confirm persistence.
5. Edit the purpose and verify the change after another refresh.

### Business

1. Create a ZAR business; it should start with zero capital.
2. Add R1,000 through Add funds.
3. Record a R250 capital return.
4. Confirm R1,000 contributed, R250 returned and R750 still invested.
5. Check History and Recent activity.
6. Refresh the browser and restart the backend; verify the same balances remain.

### Errors and Conflicts

* Stop the backend and use a refresh control. Confirm an error appears, then restart and retry.
* Attempt a repayment or capital return above the available balance. It must not be accepted.
* Open a record in two tabs, save an edit in one, then submit the older edit in the other. Expect a conflict rather than an overwrite.
* Confirm previous browser records remain available read-only.

Strict TypeScript checking and simulated API/DOM checks passed during integration work, including retry behavior, duplicate-submit guards, version conflicts and preservation of local records. That environment used TypeScript 7 and React 19.3, not this project's exact lockfile. Run the local build/lint commands and live checks above. Visual mobile and accessibility verification remain outstanding.

---

## Development Roadmap

### Implemented

* [x] React + TypeScript + Vite foundation
* [x] LedgerNest branding, tabs and mobile-first layout
* [x] Personal-debt forms, cards and repayment history
* [x] Business forms, cards and transaction history
* [x] Integer-cent calculations and manual currency conversion
* [x] Debt and Business API integration
* [x] Loading, error, empty and refresh states
* [x] Version-aware edits and transaction retry handling
* [x] Read-only preservation of previous local records

### Next

* [ ] Verify the complete Business workflow against the running backend
* [ ] Run local build and lint checks on the latest source
* [ ] Add authentication and protected routes
* [ ] Replace fixed local ownership with authenticated user identity
* [ ] Make local settings and retained browser records account-aware
* [ ] Add an explicit import flow for old local records
* [ ] Add transaction correction/reversal workflows
* [ ] Add automated tests to the repository and CI
* [ ] Verify mobile layouts, keyboard interaction and accessibility
* [ ] Add filters, exports and richer due-date reporting
* [ ] Configure production hosting and release testing

---

## Security and Project Status

The backend currently uses a fixed owner in the `ledgerlocal` environment. Authentication and multi-user isolation are not complete. Keep this development setup local until authenticated ownership and deployment controls are in place.

Never place secrets in browser-delivered configuration, including Vite `VITE_` variables. Do not commit credentials or real personal financial records in fixtures.

LedgerNest now has implemented debt and business workflows, but it is not ready for public release. For the overall project roadmap, see the [root README](../README.md).

---

## Contributing

The frontend is developed in WebStorm and the backend in IntelliJ IDEA within one shared Git repository. Root project documentation is maintained separately in VS Code.

Before committing frontend changes:

```bash
cd ~/Documents/projects/LedgerNest/frontend
npm run build
npm run lint
git add src README.md
git diff --cached --name-only
```

Stage any intentional configuration or dependency changes separately. A commit includes all already-staged changes, including changes outside the frontend, so inspect the complete staged list.

Keep `.idea/`, `node_modules/`, `dist/` and local environment files out of Git. Preserve integer-cent calculations, original currencies and transaction identities when changing financial workflows.

---

## License

No software license has been selected yet. See the root repository for future licensing updates.

© 2026 LedgerNest
