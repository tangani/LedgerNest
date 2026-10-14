# 🪺 LedgerNest Frontend

LedgerNest is a personal debt and business investment tracker designed to help users understand who they owe, who owes them, and how much money they have contributed to businesses or side projects.

This directory contains the React and TypeScript web application. It belongs to the LedgerNest monorepo alongside the Kotlin/Micronaut backend and a placeholder for future mobile applications.

Development follows a frontend-first approach: build and refine the interface with sample data, then connect each workflow to the backend.

---

## Vision

LedgerNest aims to make personal lending, borrowing and business contributions easier to record and understand.

The web application will help users:

* Track money borrowed and money lent separately
* Record partial and full repayments
* Review outstanding balances and payment history
* See upcoming due dates
* Track capital contributions, business loans and money received back
* Review each business or side project independently

Debts and investments will share one interface while retaining their different financial meanings.

---

## Current Features

### Frontend Foundation

The React + TypeScript + Vite project has been generated with:

* React application entry point and starter screen
* TypeScript configuration
* Vite development and build scripts
* ESLint configuration
* CSS files for application styling

Business screens, authentication, financial calculations and backend integration are not yet implemented. Successful local build and lint checks remain to be confirmed.

---

## Planned Features

### Debt Management

* Separate **Owed to me** and **I owe** views
* Contact name, original amount, currency, date and optional due date
* Partial and full repayment recording
* Outstanding balance calculation
* Debt details and repayment history
* Clear settled and overdue indicators

### Business Investment Tracking

* Businesses and side projects
* Capital contributions
* Business loans and repayments
* Capital returned
* Distributions received
* Per-business transaction history

Daily business sales, expenses, inventory and full profit reporting are outside the initial scope.

### Overview & Reporting

* Separate totals for amounts owed and receivable
* Contributions and receipts by business
* Currency-specific summaries
* Upcoming payments and recent activity
* History filters and future data exports

### Authentication & Account Management

* Signup and login screens
* Authenticated sessions
* Protected application routes
* Profile and currency preferences

Backend authentication and ownership validation will be required before using real financial data.

### Future Expansion

* Receipt attachments
* Reminders
* Mobile access through applications in the separate `mobile/` directory

These are future possibilities rather than requirements for the first release.

---

## Technology Stack

### Frontend

| Technology | Declared version range | Purpose |
| --- | --- | --- |
| React / React DOM | `^19.2.8` | User interface |
| TypeScript | `~6.0.2` | Static typing |
| Vite | `^8.3.0` | Development server and production build |
| Vite React plugin | `^6.1.1` | React integration |
| ESLint | `^10.10.0` | Linting |
| CSS | — | Styling |

These ranges reflect the initial `package.json`. Use `package.json` and `package-lock.json` as the authoritative dependency definitions. Commit the lockfile for reproducible installs.

Routing, UI component libraries and data-fetching libraries have not yet been selected.

### Backend

* Kotlin and Micronaut 5.2.2
* Java 25
* Micronaut Data JDBC
* PostgreSQL and Flyway integration planned

The generated backend compiles successfully. Database configuration and frontend API integration remain pending.

### Future Infrastructure

* Frontend and backend hosting
* Environment configuration
* CI build and lint checks
* Monitoring and error reporting

---

## Project Structure

The initial Vite template uses the following layout:

| Path | Purpose |
| --- | --- |
| `src/main.tsx` | Application entry point |
| `src/App.tsx` | Root component and current starter screen |
| `src/App.css` | Application styles |
| `src/index.css` | Global styles |
| `src/assets/` | Imported static assets |
| `public/` | Public static files |
| `index.html` | HTML entry document |
| `vite.config.ts` | Vite configuration |
| `tsconfig*.json` | TypeScript configuration |
| `eslint.config.js` | Lint configuration |
| `package.json` | Dependencies and scripts |
| `package-lock.json` | Resolved dependency versions after installation |

As features are implemented, introduce these folders where needed:

| Proposed path | Purpose |
| --- | --- |
| `src/components/` | Reusable interface components |
| `src/pages/` | Page-level components |
| `src/features/debts/` | Debt forms, lists and repayment workflows |
| `src/features/businesses/` | Business contribution and receipt workflows |
| `src/services/` | API access and sample-data adapters |
| `src/types/` | Shared TypeScript types |
| `src/utils/` | Currency formatting and validation helpers |

These proposed folders are not implemented yet.

---

## Pages

All pages below are planned.

| Page | Description |
| --- | --- |
| Overview | Summary of debts and business contributions, separated by currency |
| Debts | Owed-to-me and I-owe views |
| Debt details | Original amount, outstanding balance and repayment history |
| Businesses | List of businesses and side projects |
| Business details | Contributions, receipts and linked loans |
| Login | Existing user authentication |
| Signup | Account registration |
| Settings | Profile and application preferences |

The public landing page's location is still to be decided; it is not assumed to be part of this application.

---

## User Journey

### 1. Add a Debt

Choose whether money was borrowed or lent, then enter the contact, amount, currency and relevant dates.

### 2. Record a Repayment

Record a dated payment against that debt, including partial repayments.

### 3. Review the Balance

See the remaining amount and the history supporting it.

The first workflow will demonstrate **R1,000 lent − R250 repaid = R750 outstanding**.

### 4. Track Business Contributions

Create a business and distinguish capital contributions from repayable loans.

### 5. Record Money Received

Record loan repayments, capital returns and distributions under the correct category.

### 6. Review the Overview

View debts and business activity together without treating every investment as money owed back.

The initial prototype will use sample data in local state. Refreshing the page will reset that state until persistence is implemented.

---

## Getting Started

### Prerequisites

* Node.js `22.13.0` or later within the Node 22 release line
* npm
* Git

The current developer environment uses Node.js `22.17.1` and npm `10.9.2`.

### Installation

For an existing checkout:

```bash
cd ~/Documents/projects/LedgerNest/frontend
npm install
```

For a new checkout:

```bash
git clone https://github.com/tangani/LedgerNest.git
cd LedgerNest/frontend
npm install
```

After a lockfile is committed, use `npm ci` for clean, reproducible installs in CI.

### Local Development

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Vite may choose another port if that one is occupied.

The starter application does not require the backend to be running.

### Build & Lint

```bash
npm run build
npm run lint
```

The build runs TypeScript checks and creates production assets in `dist/`.

### Preview the Build

```bash
npm run preview
```

Open the URL printed in the terminal. Preview is for checking the production build locally; it is not a production hosting setup.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript build checks and generate production assets |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the built application locally |

There is no `start` or automated test script in the initial template.

---

## Development Roadmap

### Phase 1 — Foundations 🚧

* [x] Generate React + TypeScript + Vite project
* [x] Add initial build and lint scripts through the template
* [ ] Verify local development server
* [ ] Confirm production build and lint checks pass
* [ ] Replace template branding with LedgerNest
* [ ] Create responsive application navigation and layout

### Phase 2 — Debt Interface

* [ ] Add sample debts
* [ ] Build Owed-to-me and I-owe tabs
* [ ] Build add-debt form
* [ ] Build repayment form and history
* [ ] Validate amounts and currencies
* [ ] Add empty, validation-error and settled states
* [ ] Check keyboard access and mobile layouts

### Phase 3 — Business Interface

* [ ] Create business list and detail screens
* [ ] Record sample contributions and receipts
* [ ] Distinguish capital, distributions and loans
* [ ] Build per-business summaries

### Phase 4 — Backend Integration

* [ ] Agree API request and response types
* [ ] Implement authentication and protected routes
* [ ] Connect debt and repayment APIs
* [ ] Connect business APIs
* [ ] Handle loading, network failures and expired sessions
* [ ] Verify records persist after refresh
* [ ] Verify backend enforcement of record ownership

### Phase 5 — Reporting & Release

* [ ] Build currency-specific overview totals
* [ ] Add history filters and due-date summaries
* [ ] Test financial calculations and critical user journeys
* [ ] Configure CI and hosting
* [ ] Verify accessibility and responsive behaviour

---

## Project Status

🚧 **Early development — frontend scaffold generated.**

LedgerNest is not yet a functional financial tracker. The next milestone is the first debt interaction using synthetic data. Authentication, persistence and backend integration will follow.

For the overall project vision and roadmap, see the [root README](../README.md).

---

## Contributing

Development currently focuses on small, component-specific changes. The frontend is developed in WebStorm and the backend in IntelliJ IDEA, within one shared Git repository.

Before committing frontend changes, run build and lint checks and inspect the staged files:

```bash
cd ~/Documents/projects/LedgerNest/frontend
npm run build
npm run lint
git add .
git diff --cached --name-only
```

Running `git add .` here stages this directory's changes. A commit still includes any changes already staged elsewhere, so review the complete staged list.

Keep `.idea/`, `node_modules/`, `dist/` and local environment files out of Git. Never include credentials or real personal financial data in fixtures. Browser-delivered configuration, including Vite `VITE_` variables, must not contain secrets.

Preserve decimal amounts accurately, keep currencies separate, and confirm financial rules on the backend when API integration is added.

---

## License

No software license has been selected yet. See the root repository for future licensing updates.

© 2026 LedgerNest
