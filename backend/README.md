# 🪺 LedgerNest Backend

The Kotlin/Micronaut backend for LedgerNest: personal debts, repayments, business contributions and returned capital.

The backend exposes REST APIs used by the React/TypeScript frontend and persists financial records in PostgreSQL. Flyway manages schema migrations.

> **Status — 16 October 2026:** Debt creation, retrieval, repayment recording and persistence after restart have been verified locally. Business APIs are implemented and the list endpoint has been verified. Full live Business workflow and concurrency verification remain outstanding. Authentication is not implemented; the current API uses a fixed owner in the local environment.

---

## Current Features

### Personal Debts

* Create and list debts under Owed to me (`receivable`) or I owe (`payable`)
* Retrieve and edit debt details
* Record dated partial or full repayments
* Derive repaid and outstanding amounts from repayment history
* Prevent repayments above the outstanding balance
* Prevent reducing principal below recorded repayments
* Lock currency and direction after a repayment

### Business Capital

* Create, list, retrieve and edit businesses
* Record capital contributions (`contribution`) and returned capital (`capital_return`)
* Derive total contributed, total returned and remaining invested capital
* Prevent returning more capital than remains invested
* Lock currency after any transaction

Business loans, profit distributions, interest, transaction corrections/reversals and deletion endpoints are not implemented. Remaining invested capital is not profit or current business value.

### Consistency

* Integer-cent monetary amounts
* Version checks for metadata edits
* Client-supplied UUIDs for idempotent repayment and business transaction requests
* Managed transactions and parent-row locks for writes
* Owner-scoped queries, currently using a fixed local owner

---

## Technology Stack

| Component | Technology |
| --- | --- |
| Language | Kotlin |
| Framework | Micronaut; generated project documentation identifies 5.2.2 |
| Java target | Java 25 |
| Build | Repository Gradle wrapper and Kotlin DSL |
| Serialization | Micronaut Serialization with Jackson |
| Database | PostgreSQL |
| SQL access | Parameterized JDBC with Micronaut-managed transactions |
| Connection pooling | HikariCP |
| Migrations | Flyway |
| Annotation processing | Kotlin Symbol Processing (KSP) |
| Tests | JUnit 5 / Micronaut Test, plus local API smoke scripts |

Use `build.gradle.kts`, `gradle.properties` and the Gradle wrapper files as the authoritative version configuration. No additional dependencies were required for the Business slice.

---

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/main/kotlin/com/ledgernest/Application.kt` | Application entry point |
| `src/main/kotlin/ledgernest/controllers/` | HTTP routes and responses |
| `src/main/kotlin/ledgernest/models/` | Request and response models |
| `src/main/kotlin/ledgernest/services/` | Validation, ownership context and financial rules |
| `src/main/kotlin/ledgernest/repositories/` | SQL and transaction boundaries |
| `src/main/resources/application.properties` | Base configuration |
| `src/main/resources/application-ledgerlocal.properties` | Local API and database configuration |
| `src/main/resources/db/migration/` | Flyway SQL migrations |
| `src/test/kotlin/` | Automated JVM tests |
| `scripts/smoke-businesses.py` | Business API smoke checks |

Controllers delegate to services. Services coordinate business rules inside repository transactions. Repositories manage database access and persistence errors.

The application main class is `com.ledgernest.ApplicationKt`. Feature classes currently use `ledgernest.*`; the supplied build configuration includes both package patterns in `micronaut.processing.annotations`.

---

## Local Development

### Prerequisites

* JDK 25 configured for the shell and IntelliJ Gradle JVM
* The repository's Gradle wrapper
* A running PostgreSQL database matching the local connection settings
* Docker and Docker Compose if using the supplied local database setup
* Python 3 for the optional API smoke script

From `LedgerNest/backend`, check Java and build:

```bash
java -version
./gradlew clean assemble
```

If `gradlew` exists but is not executable:

```bash
chmod +x gradlew
```

### Database Configuration

The `ledgerlocal` properties currently use:

| Setting | Local value |
| --- | --- |
| JDBC URL | `jdbc:postgresql://localhost:5433/ledgernest` |
| Database | `ledgernest` |
| Username | `ledgernest` |
| Password | Local-development-only value in `application-ledgerlocal.properties` |
| Connection pool maximum | 5 |
| Flyway location | `classpath:db/migration` |

If the previously supplied `compose.ledgernest.yml` is present in this directory, start its database with:

```bash
docker compose -f compose.ledgernest.yml up -d
```

Otherwise start your existing PostgreSQL instance and ensure its port, database and credentials match the properties. Do not start a second database on the same port.

### Run

```bash
MICRONAUT_ENVIRONMENTS=ledgerlocal ./gradlew run
```

The local server binds to `127.0.0.1:8080`. Debt and Business components are enabled by `@Requires(env = ["ledgerlocal"])`; activate this environment when running from IntelliJ as well.

### Verify

In a second terminal:

```bash
curl -i http://localhost:8080/api/v1/debts
curl -i http://localhost:8080/api/v1/businesses
```

Expect `200 OK` and JSON arrays. An empty array is valid when no records exist. A successful build alone does not verify the database connection or API behavior.

### Frontend Connection

The frontend development server runs at `http://localhost:5173` and proxies `/api` to `http://127.0.0.1:8080`. Local CORS configuration also allows the frontend origin. Production routing and security are not configured by this local setup.

---

## Database Migrations

| Migration | Tables |
| --- | --- |
| `V202610151315__create_ledgernest_debts.sql` | `ln_debt`, `ln_repayment` |
| `V202610160700__create_ledgernest_businesses.sql` | `ln_business`, `ln_business_transaction` |

Flyway applies pending migrations at application startup in the configured local environment.

Add new versioned SQL files for schema changes. Do not edit migrations already applied to a database. Preserve database volumes and Flyway history when installing code updates.

Debt and business tables hold metadata and version numbers. Their child tables hold repayment or capital-transaction history. Business transaction ownership is also enforced through a composite foreign key to the parent business.

---

## API Reference

All paths below are relative to `http://localhost:8080`.

| Method | Path | Success response |
| --- | --- | --- |
| GET | `/api/v1/debts` | 200, array of debts |
| POST | `/api/v1/debts` | 201, created debt and Location header |
| GET | `/api/v1/debts/{id}` | 200, debt with repayment history |
| PUT | `/api/v1/debts/{id}` | 200, updated debt |
| POST | `/api/v1/debts/{id}/repayments` | 200, debt with updated balances/history |
| GET | `/api/v1/businesses` | 200, array of businesses |
| POST | `/api/v1/businesses` | 201, created business and Location header |
| GET | `/api/v1/businesses/{id}` | 200, business with transaction history |
| PUT | `/api/v1/businesses/{id}` | 200, updated business |
| POST | `/api/v1/businesses/{id}/transactions` | 200, business with updated totals/history |

List endpoints accept `limit` (default 50, range 1–100) and `offset` (default 0, non-negative). They return arrays rather than a pagination envelope and include transaction history. Clients must request subsequent pages for complete totals. Offset pagination is not a snapshot across separate requests.

Common errors:

* **400:** Invalid fields, pagination or missing update version
* **404:** Record not found for the current owner
* **409:** Stale version, conflicting transaction ID, locked currency change or financial limit violation

Empty fields and collections may be omitted by the current serializer. Clients should normalize missing repayment/transaction arrays to `[]` and optional text to an empty string where appropriate.

### Request Fields

| Request | Fields |
| --- | --- |
| Debt create/edit | `person`, `direction`, `currency`, `principal`; optional `purpose`, `due`, `notes`; `version` required for edits |
| Repayment | `id`, `amount`, `date`; optional `notes` |
| Business create/edit | `name`, `currency`; optional `description`; `version` required for edits and omitted for creation |
| Business transaction | `id`, `kind`, `amount`, `date`; optional `notes` |

Dates use `YYYY-MM-DD`. A missing debt due date can be omitted or sent as `null`. The create/edit business request does not accept opening balance fields; record opening contributions and capital returns as transactions.

### Create a Debt

```bash
curl -i -X POST http://localhost:8080/api/v1/debts \
  -H 'Content-Type: application/json' \
  -d '{"person":"Alex","direction":"receivable","currency":"ZAR","principal":100000,"purpose":"Equipment loan"}'
```

The principal represents R1,000. Copy the returned debt ID before recording a repayment:

```bash
DEBT_ID='paste-returned-debt-id'
REPAYMENT_ID=$(uuidgen)
PAYMENT_DATE=$(TZ=Africa/Johannesburg date +%F)

curl -i -X POST "http://localhost:8080/api/v1/debts/$DEBT_ID/repayments" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$REPAYMENT_ID\",\"amount\":25000,\"date\":\"$PAYMENT_DATE\",\"notes\":\"First repayment\"}"
```

Expect `repaid: 25000` and `outstanding: 75000`. Repeating only the curl command with the same ID and details must not add another repayment.

### Create and Fund a Business

```bash
curl -i -X POST http://localhost:8080/api/v1/businesses \
  -H 'Content-Type: application/json' \
  -d '{"name":"Poultry project","currency":"ZAR","description":"Coop and laying hens"}'
```

Copy the returned business ID:

```bash
BUSINESS_ID='paste-returned-business-id'
CONTRIBUTION_ID=$(uuidgen)
TRANSACTION_DATE=$(TZ=Africa/Johannesburg date +%F)

curl -i -X POST "http://localhost:8080/api/v1/businesses/$BUSINESS_ID/transactions" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$CONTRIBUTION_ID\",\"kind\":\"contribution\",\"amount\":100000,\"date\":\"$TRANSACTION_DATE\",\"notes\":\"Initial capital\"}"
```

Record R250 returned:

```bash
RETURN_ID=$(uuidgen)

curl -i -X POST "http://localhost:8080/api/v1/businesses/$BUSINESS_ID/transactions" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$RETURN_ID\",\"kind\":\"capital_return\",\"amount\":25000,\"date\":\"$TRANSACTION_DATE\",\"notes\":\"Capital returned\"}"
```

Expect `contributed: 100000`, `returned: 25000`, and `invested: 75000`. Restart the backend and retrieve the record again to verify persistence.

### Metadata Updates

Retrieve the latest record and include its `version` in PUT requests. PUT supplies the complete editable details; it is not a partial PATCH. Fields with defaults can be reset when omitted.

Each successful metadata update or new transaction increments the parent's version. After a conflict, reload the record and review the latest state before resubmitting. Do not simply replace the version without reviewing concurrent changes.

---

## Money and Validation Rules

```text
Outstanding debt = Principal − Repayments
Capital still invested = Contributions − Capital returns
```

* Amounts are Kotlin `Long`, PostgreSQL `BIGINT` and integer JSON numbers in cents. The current implementation does not store monetary values as `BigDecimal` or `NUMERIC`.
* Supported currencies are ZAR and USD. Each transaction uses its parent record's currency.
* Individual positive amounts are limited to `100000000000` cents. Cumulative business contributions have the same limit.
* Debt principal must remain at least the amount already repaid.
* Repayments and capital returns cannot exceed the current available balance.
* Repayment and business transaction dates cannot be in the future, using `Africa/Johannesburg` as the service's date reference.
* Business transaction dates describe the entries; validation uses the current balance rather than calculating a historical as-of-date balance.
* Currency and direction lock after any debt repayment. Business currency locks after any transaction, even if all capital is later returned.
* Person and business names allow 1–100 characters. Debt purposes allow up to 160; notes and business descriptions allow up to 2,000.

Exchange-rate conversion currently happens in the frontend for display using a manually entered rate. The backend preserves original currencies and amounts; it does not fetch rates or convert stored records.

---

## Transactions, Concurrency and Retries

Repositories use `TransactionOperations<Connection>` and the transaction's managed connection. Micronaut owns connection lifecycle, commit and rollback; repository code must not manually close that connection or set its auto-commit mode. Statements and result sets are still closed normally.

Read operations use repeatable-read isolation. Write operations use read-committed isolation and lock the parent debt/business row before checking balances, inserting a transaction and incrementing the version. These steps occur in one database transaction.

A repayment or business transaction UUID identifies one logical operation:

* Same parent and identical normalized details: return the parent's current state without adding another entry or incrementing version again.
* Same ID with conflicting details or a different parent: return 409.
* A uniqueness failure is translated after rollback so a failed write does not leave partial changes.

Debt and business creation do not yet accept idempotency keys. If a creation response is lost, retrieve the list before retrying creation. Repayment and Business transaction IDs belong to their respective tables; they are not one shared cross-module ID namespace.

---

## Testing and Verification

### Build and JVM Tests

```bash
./gradlew clean assemble
./gradlew test
```

The supplied source includes a generated application-startup test. Passing it is not evidence of complete debt/business integration coverage. Tests that require the local profile need a correctly configured database; future database tests should use an isolated test database.

### Business API Smoke Tests

With the backend running locally:

```bash
python3 scripts/smoke-businesses.py
```

The script creates and retains two named test businesses, including one with a maximum-sized test contribution. Use a development database. It prints the created IDs and does not delete records.

It covers invalid inputs, metadata versions, currency locking, derived balances, matching retries, conflicting IDs, concurrent returns, concurrent identical contributions, rollback and cumulative limits.

### Verification Status

* Debt API and persistence behavior have been verified locally during development.
* The Business list endpoint has been verified locally.
* Business source was reviewed and smoke-script syntax checked when the slice was prepared; compilation, migration execution and full live smoke checks were not performed in that preparation environment.
* Run the local build and live tests against the installed source before treating the Business slice as fully verified.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `gradlew` not found | Run from the backend directory containing the Gradle wrapper; confirm the project was generated there |
| `ApplicationKt` not found | Confirm `Application.kt` declares `package com.ledgernest` and contains a top-level `main`; build config should reference `com.ledgernest.ApplicationKt` |
| More than one route matches | Look for duplicate controllers, especially old `ledgernest/debts` files alongside `ledgernest/controllers`; retain the intended layered implementation |
| No current connection present | Ensure JDBC work runs inside the managed transaction callback; do not use the contextual connection outside its transaction |
| API routes unavailable | Confirm `MICRONAUT_ENVIRONMENTS=ledgerlocal` and successful application startup |
| Database connection failure | Check PostgreSQL, port 5433, database name and local credentials |
| Flyway validation failure | Review migration history and whether an applied file changed; do not reset the database as a default fix |
| Unexpected 500 response | Inspect the backend exception log; the HTTP response deliberately contains limited detail |

---

## Security and Deployment

Debt and Business services currently use the fixed local owner UUID `00000000-0000-0000-0000-000000000001`. Owner-scoped SQL exists, but it does not provide authenticated multi-user isolation until the owner comes from a verified identity.

Authentication, protected APIs and user-isolation tests must be completed before public deployment. Local credentials are for development only. Production work must include externalized secrets, HTTPS, restricted database access, backups with restoration checks, and appropriate logging/monitoring.

Do not commit credentials, tokens, database dumps or personal financial data. Keep unnecessary personal information out of logs.

---

## Roadmap

* [x] Debt APIs, repayments and PostgreSQL persistence
* [x] Business APIs and transaction schema
* [x] Managed transaction boundaries, row locks and version checks
* [x] Client transaction IDs and retry handling
* [ ] Complete live Business workflow and concurrency verification
* [ ] Add automated repository/service/API integration tests to CI
* [ ] Implement authentication and derive ownership from authenticated identity
* [ ] Test cross-user isolation
* [ ] Add idempotent debt/business creation
* [ ] Add explicit import support for previous browser records
* [ ] Add transaction corrections/reversals and a fuller audit trail
* [ ] Prepare production configuration, backups and deployment

See the [root README](../README.md) for the wider product roadmap and the [frontend README](../frontend/README.md) for web setup.

---

## Framework Documentation

Links retained from the generated Micronaut project:

* [Micronaut 5.2.2 User Guide](https://docs.micronaut.io/5.2.2/guide/index.html)
* [API Reference](https://docs.micronaut.io/5.2.2/api/index.html)
* [Configuration Reference](https://docs.micronaut.io/5.2.2/guide/configurationreference.html)
* [Micronaut Guides](https://guides.micronaut.io/index.html)
* [Micronaut Gradle Plugin](https://micronaut-projects.github.io/micronaut-gradle-plugin/latest/)
* [Micronaut Serialization](https://micronaut-projects.github.io/micronaut-serialization/latest/guide/)
* [Micronaut Data JDBC](https://micronaut-projects.github.io/micronaut-data/latest/guide/index.html#jdbc)
* [Hikari JDBC Connection Pool](https://micronaut-projects.github.io/micronaut-sql/latest/guide/index.html#jdbc)
* [Micronaut Flyway Integration](https://micronaut-projects.github.io/micronaut-flyway/latest/guide/index.html)
* [Flyway](https://flywaydb.org/)
* [Micronaut Validation](https://micronaut-projects.github.io/micronaut-validation/latest/guide/)
* [Management Endpoints](https://docs.micronaut.io/latest/guide/index.html#management)
* [Micronaut Kotlin/KSP](https://docs.micronaut.io/latest/guide/#kotlin)
* [KSP Overview](https://kotlinlang.org/docs/ksp-overview.html)
* [Micronaut Test Resources](https://micronaut-projects.github.io/micronaut-test-resources/latest/guide/)
* [Micronaut AOT](https://micronaut-projects.github.io/micronaut-aot/latest/guide/)
* [GraalVM Gradle Plugin](https://graalvm.github.io/native-build-tools/latest/gradle-plugin.html)
* [Shadow Gradle Plugin](https://gradleup.com/shadow/)

---

## License

No software license has been selected yet. See the root repository for licensing updates.

© 2026 LedgerNest
