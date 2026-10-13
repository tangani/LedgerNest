# 🪺 LedgerNest

LedgerNest is a personal debt and business investment tracker being built to answer three questions: **Who do I owe? Who owes me? How much money have I put into my businesses, and what has come back?**

The planned full-stack platform consists of:

* 🌐 React + TypeScript web application
* ⚙️ Kotlin + Micronaut backend APIs
* 🗄️ PostgreSQL database
* 📱 Future mobile applications, with a reserved `mobile/` directory

> **Status:** Repository initialised. Application generation and feature implementation are next. Unless explicitly marked complete, capabilities below describe the intended design.

---

# 🎯 Vision

Money lent to friends, money borrowed, and contributions to small businesses can be difficult to track across messages, receipts and spreadsheets.

LedgerNest aims to provide one place to:

* Track personal borrowing and lending separately
* Record partial repayments and outstanding balances
* See payment history and upcoming due dates
* Record money contributed to each business or side project
* Distinguish business loans from capital contributions
* Track capital returned and distributions received
* Keep a clear history of financial activity

The initial focus is a useful tool for personal use, with a foundation that can later support other users.

---

# 💡 Financial Model

LedgerNest is organised around four areas.

## Money I Owe

Money borrowed from another person or organisation.

Each debt will record the lender, original amount, currency, borrowing date, optional due date, notes and repayments made.

## Money Owed to Me

Money lent to another person or organisation.

Each debt will record the borrower, original amount, currency, lending date, optional due date, notes and repayments received.

The same person may have multiple debts in either direction. Each agreement will retain its own balance and history.

## Business Investments

Money personally provided to a business or side project, such as a poultry project, printing business or software venture.

Planned transaction categories include:

* **Capital contribution:** Money invested without an automatic repayment obligation
* **Business loan:** Money advanced with an expectation of repayment
* **Capital returned:** Money explicitly recorded as a return of contributed capital
* **Distribution received:** Money paid out to the investor, recorded separately from capital returned

The first version will track the owner's contributions and receipts. Daily business sales, expenses, inventory and full profit reporting are outside the initial scope.

## Reports

Planned summaries will show:

* Total owed and total receivable, separately by currency
* Outstanding and settled debts
* Upcoming and overdue repayments where due dates exist
* Contributions and receipts by business
* Business loan balances
* Transaction history and monthly activity

---

# 🚀 Current Status

## Current Milestone

**Repository foundation established.**

LedgerNest currently has a GitHub repository and a monorepo layout. The backend, frontend, database integration and authentication have not yet been implemented.

The first functional milestone is:

> Add a person, record R1,000 lent to them, record a R250 repayment, and display R750 outstanding after refreshing the page.

---

# ✅ Completed

## Frontend

* Reserved `frontend/` directory

## Backend

* Reserved `backend/` directory

## Infrastructure

* Git repository initialised
* GitHub repository created at [tangani/LedgerNest](https://github.com/tangani/LedgerNest)
* Initial commit pushed
* Root README and `.gitignore` files created
* Reserved `mobile/` directory

These are repository scaffolding milestones; no working application or deployment is claimed yet.

---

# 🏗️ Architecture

## Planned Technology Stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web frontend | React, TypeScript, Vite | Forms, dashboards and transaction history |
| Backend | Kotlin, Micronaut | APIs, validation and financial rules |
| Persistence | Micronaut Data JDBC | Database access |
| Database | PostgreSQL | Persistent application data |
| Migrations | Flyway | Versioned database schema changes |
| Local infrastructure | Docker Compose | Local database environment |
| Mobile | To be decided | Future mobile access |

The web application will call the backend over HTTP. The backend will validate requests, apply business rules and persist records in PostgreSQL.

The backend will begin as a single application with controllers, services and repositories, organised into debt and business investment modules.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `backend/` | Kotlin and Micronaut backend |
| `frontend/` | React and TypeScript web application |
| `mobile/` | Placeholder for future mobile applications |
| `.gitignore` | Repository exclusions |
| `README.md` | Project overview and roadmap |

## Planned Domain Model

| Record | Purpose |
| --- | --- |
| User | Owns private records and account settings |
| Contact | Identifies a person or organisation involved in a debt |
| Debt | Records direction, principal, currency, dates and optional business association |
| Repayment | Records a dated payment against a debt |
| Business | Groups activity for a business or side project |
| Investment transaction | Records a capital contribution, capital return or distribution |

A business loan will use a debt record linked to its business. It will not be duplicated as a capital contribution.

---

# 💵 Cash Flow Philosophy

LedgerNest will preserve the distinction between **money owed**, **money invested** and **money received**.

For the initial interest-free debt workflow:

```text
Outstanding debt = Original amount − Recorded repayments
```

For capital tracking:

```text
Net contributed capital = Capital contributions − Explicit capital returns
```

Distributions will be displayed separately. Net contributed capital is a record of contributions and returns, not an estimate of current investment value or business profit.

Core calculation rules:

* Use Kotlin `BigDecimal` and PostgreSQL `NUMERIC` for monetary calculations and storage.
* Carry decimal amounts across the API as strings to avoid accidental JavaScript floating-point calculations.
* Store a currency with every financial record and keep totals separate by currency.
* Require repayments to use the debt's currency and prevent payments above its outstanding balance in the initial workflow.
* Derive debt balances from principal and repayment history.
* Preserve a traceable history when correcting financial records.
* Avoid counting a contribution and the business expense it funds as two personal investments.
* Keep business sales separate from money actually paid back to the owner.

---

# 🗺️ Development Roadmap

## Phase 1 — Foundations 🚧

* [x] Initialise repository and push to GitHub
* [x] Create backend, frontend and mobile directories
* [ ] Generate Kotlin/Micronaut backend
* [ ] Generate React/TypeScript frontend
* [ ] Configure local PostgreSQL with Docker Compose
* [ ] Configure Flyway migrations
* [ ] Verify backend health endpoint
* [ ] Connect frontend to backend

## Phase 2 — First Debt Workflow

* [ ] Create and list contacts
* [ ] Record money borrowed and money lent
* [ ] Record partial and full repayments
* [ ] Calculate outstanding balances
* [ ] Display transaction history
* [ ] Verify data persists after refresh
* [ ] Test repayment limits, currency validation and concurrent repayments

Use synthetic records during this development phase.

## Phase 3 — Authentication & Ownership

* [ ] Implement signup and login
* [ ] Hash passwords
* [ ] Implement JWT authentication
* [ ] Protect application routes and backend APIs
* [ ] Enforce user ownership on all financial records
* [ ] Test isolation between users

Complete this phase before entering real financial data or exposing financial APIs publicly.

## Phase 4 — Business Investment Tracking

* [ ] Create businesses and side projects
* [ ] Record capital contributions
* [ ] Record capital returned and distributions separately
* [ ] Link business loans to the debt module
* [ ] Display per-business contributions, receipts and loan balances

## Phase 5 — Dashboard & Reporting

* [ ] Summarise debts by direction and currency
* [ ] Show upcoming and overdue payments
* [ ] Filter history by contact, business and date
* [ ] Display monthly activity summaries
* [ ] Export records

## Phase 6 — Reliability & Deployment

* [ ] Add CI build and test checks
* [ ] Configure deployment environments and secrets
* [ ] Configure database backups and verify restoration
* [ ] Add operational logging and monitoring
* [ ] Deploy backend and frontend

## Phase 7 — Future Expansion

* [ ] Evaluate reminders and receipt attachments
* [ ] Evaluate mobile applications and offline access
* [ ] Assess demand for daily business income and expense tracking
* [ ] Explore commercialisation after validating the core workflows

These are future possibilities, not commitments for the first release.

---

# 🔐 Security

Application security is **planned, not yet implemented**.

The intended baseline includes password hashing, authenticated APIs, record ownership checks, request validation, environment-based secrets and HTTPS for deployed traffic.

Logs should exclude passwords, tokens and unnecessary financial or contact details. Real credentials and personal financial records must not be committed to the repository.

---

# 💡 Why LedgerNest Exists

Personal debts and small-business contributions often live in different places, even when they come from the same pocket.

LedgerNest brings those records together while retaining their different meanings. Its purpose is to make repayment obligations, outstanding balances and business contributions easier to understand and follow up.

---

# 🌱 Project Philosophy

## Simplicity

Make recording a debt, repayment or contribution straightforward.

## Transparency

Show how each balance was calculated and which transactions support it.

## Privacy

Keep each user's records accessible only to authorised users.

## Accuracy

Treat amounts, currencies and transaction history consistently.

## Sustainable Scope

Build one useful workflow at a time and expand based on actual needs.

---

# 📚 Documentation

This README is the current project overview. Component setup instructions will be added as the applications are generated:

* `backend/README.md` — Planned backend setup, database configuration and API documentation
* `frontend/README.md` — Planned frontend setup and development instructions
* `mobile/README.md` — Future mobile documentation

Runnable setup commands will be documented once the corresponding components exist.

---

# 📄 License

No software license has been selected yet. A license file will be added when the licensing approach is decided.

LedgerNest is under active development and is not yet ready for public use.

© 2026 LedgerNest
