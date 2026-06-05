---
name: Rapid Invoice Portal
overview: Replace the Accela-embedded Rapid Invoice Portal with a standalone React (Vite) + Node/Express app deployed as two Render services. The Express BFF holds Accela credentials and proxies the three EMSE scripts; the frontend reproduces the Accela look and the search to calculate to invoice flow. Built UI-first across four sprints, wired to the live Accela SUPP environment per sprint.
todos:
  - id: sprint-00
    content: "Sprint 00 (infra): create dev branch + push; scaffold backend/ (Node+TS+Express) and frontend/ (React+TS+Vite) monorepo; generate README/ARCHITECTURE/IMPLEMENTATION_PLAN/CHANGELOG from templates; .gitignore covering .env*; .env.example; render.yaml (2 services); shared TS types + mock-data seam. PR into dev."
    status: pending
  - id: sprint-01
    content: "Sprint 01 (record lookup): UI for search box + on-tab-out fetch, record banner, dynamic FEE VALUES grid (Reported/Adjusted/Last Reported) on mocks; then wire backend GET /api/record/:controlId -> GET_RECORD_CUSTOM_FIELDS and verify against live SUPP. Tests, docs, PR into dev."
    status: pending
  - id: sprint-02
    content: "Sprint 02 (fee calc): UI for Reported entry with copy-to-Adjusted on blur, FEE SUMMARY grid (Reported/Adjusted/System read-only), Recalculate button on mocks; then wire POST /api/calculate -> GET_GENEREAL_RENEWAL_FEE and verify against live SUPP. Tests, docs, PR into dev."
    status: pending
  - id: sprint-03
    content: "Sprint 03 (invoicing): UI for Invoice Fees button + invoice number/link + messages display on mocks; then wire POST /api/invoice -> INVOICE_RENEWAL_FEES and verify against live SUPP. Tests, docs, PR into dev."
    status: pending
  - id: render-deploy
    content: Finalize render.yaml and document Render deployment (2 services, env vars, CORS origin) in README; confirm static site -> web service wiring.
    status: pending
isProject: false
---

# Rapid Invoice Portal - Replacement Build

## Goal
Rebuild the Accela-embedded Rapid Invoice Portal (`clarkco.rapidinvoice`) as a standalone app hosted on Render. A user enters a `Control ID`, the page loads the renewal record + dynamic fee-value fields, calculates renewal fees, and invoices them - all by proxying three Accela EMSE scripts through a trusted Node backend. No payments in scope; all license types supported; UI must match the current Accela look.

## Architecture

```mermaid
flowchart LR
  user[User Browser] -->|"Control ID, fee values"| fe["Frontend: React + Vite (Render Static Site)"]
  fe -->|"/api/record, /api/calculate, /api/invoice"| be["Backend: Node + Express (Render Web Service)"]
  be -->|"OAuth2 password grant"| oauth["apis.accela.com/oauth2/token"]
  be -->|"POST /v4/scripts/{name} + Bearer token"| scripts["apis.accela.com/v4/scripts"]
  scripts --> emse["EMSE scripts in CLARKCO / SUPP"]
```

The browser never sees Accela credentials. The backend caches the OAuth token (per `expires_in`) and unwraps the `data.result.result.*` envelope described in [.cursor/rules/ACCELA_EMSE_API_GUIDE.md](.cursor/rules/ACCELA_EMSE_API_GUIDE.md).

### Backend endpoints (exact EMSE script names, posted as-is)
- `GET /api/record/:controlId` -> `GET_RECORD_CUSTOM_FIELDS` (body `{ recordId }`)
- `POST /api/calculate` -> `GET_GENEREAL_RENEWAL_FEE` (body `{ recordId, feeCustomFields: [{fieldName, fieldValue}], payDate? }`)
- `POST /api/invoice` -> `INVOICE_RENEWAL_FEES` (body `{ recordId }`)

### EMSE response shapes (from the scripts in `.cursor/EMSE Scripts/`)
- `GET_RECORD_CUSTOM_FIELDS` returns: `appName`, `licenseNumber`, `renewalNumber`, `locationAddress`, `dueDate`, `gracePeriodEnd`, `delinquentDate`, and `customFieldsGroups[]` where each group has `subGroupName`, `numberOfColumns`, `customFields[]` (`fieldName`, `fieldAlias`, `oldValue` = "Last Reported", `isRequired`, `isReadOnly`, `isFeeField`). The `FEE VALUES` group drives the Reported/Adjusted/Last Reported grid.
- `GET_GENEREAL_RENEWAL_FEE` returns: `fees` (e.g. `renewalFees`, `penaltyFee`, `reinstatementFee`) and `feeItems[]` (`feeSeqNbr`, `feeAmount`, `feeCode`, `feeDescription`) -> drives the read-only System column in FEE SUMMARY.
- `INVOICE_RENEWAL_FEES` returns: `invoiceNumber`, `invoiceLink`, `messages`.

## Tech stack
- Frontend: React + TypeScript (Vite), TanStack Query (async on-blur calls), React Hook Form (dynamic grids + copy Reported->Adjusted on blur), hand-rolled CSS matching Accela (blue header, gray record banner, fee grids).
- Backend: Node + TypeScript, Express, axios, dotenv, in-memory token cache. CORS locked to the frontend origin.
- Deploy: monorepo with `render.yaml` Blueprint -> 2 services (Static Site + Web Service).

## Repo layout
```
backend/   src/{config.ts, accela/auth.ts, accela/runScript.ts, routes/{record,calculate,invoice}.ts, app.ts, server.ts}
frontend/  src/{api/client.ts, components/*, pages/RapidInvoicePage.tsx, mocks/*, styles/*}
render.yaml
README.md ARCHITECTURE.md IMPLEMENTATION_PLAN.md CHANGELOG.md .gitignore .env.example
```

## Sprints (UI-first within each; wire to live Accela SUPP after each UI phase)
- Sprint 00 - Infra/scaffold (infrastructure exception, built up front): `dev` branch, monorepo, TS configs, docs from `*.template`, `.gitignore` covering `.env*`, `render.yaml`, mock-data seam, shared TS types.
- Sprint 01 - Record lookup & display: search box + on-tab-out fetch, record banner, dynamic FEE VALUES grid. UI on mocks -> wire `GET_RECORD_CUSTOM_FIELDS`.
- Sprint 02 - Fee calculation: Reported entry, copy-to-Adjusted on blur, FEE SUMMARY (System read-only), Recalculate. UI on mocks -> wire `GET_GENEREAL_RENEWAL_FEE`.
- Sprint 03 - Invoicing: Invoice Fees button, invoice number/link + messages. UI on mocks -> wire `INVOICE_RENEWAL_FEES`.

## Per-sprint Definition of Done
Tests written + run (output shown), lint/format/type-check clean, the four docs updated in the same commits with `IMPLEMENTATION_PLAN.md`/`ARCHITECTURE.md` statuses in sync, atomic Conventional Commits on a `feature/*` branch, PR opened into `dev` (not merged locally).

## Security
Credentials only in git-ignored `.env` (local) and Render env vars (prod): `ACCELA_CLIENT_ID/SECRET`, `ACCELA_USERNAME/PASSWORD`, `ACCELA_AGENCY=CLARKCO`, `ACCELA_ENVIRONMENT=SUPP`, `ACCELA_SCOPE=run_emse_script`. `.env.example` holds placeholders only. Token never logged.

## Git workflow
Create `dev` from `main`, push as upstream. Each sprint on its own `feature/<slice>` branch off `dev`; PR into `dev` via `gh`; not merged locally.