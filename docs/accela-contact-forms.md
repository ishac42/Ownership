# Accela Contact Forms — Feature Branch Tracker

Use this document when reviewing or merging the contact form work into `main`.

## Branch info

| Item | Value |
|------|-------|
| **Feature branch** | `feature/accela-contact-forms` |
| **Base branch** | `main` (at `ec934e4`) |
| **Feature commit** | `94251e1` — *Expand contact forms to match Accela screenshots while keeping add-owner API payload minimal.* |
| **Prior holding branch** | `dev` (same commit; can be retired after feature branch is adopted) |
| **Remote** | Push with `git push -u origin feature/accela-contact-forms` |

## Purpose

Align **Individual** and **Organization** add/edit/view owner forms with Accela “Contact - Add New Individual” and “Contact - Add New Business” screenshots, while keeping the **add-owner API** limited to fields the Accela script already accepts.

## Files changed (8)

| File | Role |
|------|------|
| `my-app/src/components/AddOwnerForm.tsx` | Add-owner modal; full field UI by ownership type |
| `my-app/src/components/EditOwnerForm.tsx` | Edit-owner form; mirrors add fields |
| `my-app/src/components/OwnerDetailsCard.tsx` | Read-only view + edit field map for API updates |
| `my-app/src/components/OwnershipList.tsx` | Uses `buildAddOwnerPayload()` for add |
| `my-app/src/components/OwnershipChart.tsx` | Uses `buildAddOwnerPayload()` for add |
| `my-app/src/utils/contactOptions.ts` | Shared dropdown lists (countries, states, address types, etc.) |
| `my-app/src/utils/ownerPayload.ts` | Payload builders for add vs full edit mapping |
| `my-app/src/utils/normalize.js` | Normalizes new fields from API/tree data |

## UI — Organization (Business)

Fields added/organized to match screenshot:

- Business Name, Business Type, Resort Hotel
- Address Type, Location Name, Attention Name, Opt Addr Line, Unit Type, Unit Number, Street Address, Country, City, State, Zip
- FEIN, State License Number, State Sales Tax Number, Professional License Type, Prof License #
- Business Description, Location Description
- Phone, FAX, Cell Phone, eMail, Web Page, Comments
- Percent (%) Owned (app-specific; retained)

## UI — Individual

Fields added/organized to match screenshot:

- Title, First Name, M.I., Last Name, Suffix
- Type of Entity (from ref data API)
- Address Type, Attention Line 1, Opt Addr Line, Unit Type, Unit Number, Street Address, Country, City, State, Zip
- DOB, Gender, U.S. Citizen
- Driver's License, License State
- Professional Type, Professional Lic. Number, Other License Type/Number
- Phone, Fax, Cell, Pager, eMail, Comments
- Percent (%) Owned (app-specific; retained)

## API / backend behavior (important)

### Add owner (`POST /api/add-owner`)

- Uses **`buildAddOwnerPayload()`** only — **minimal field set** so Accela `API_ADD_OWNER_INFO` continues to work.
- **New form fields are NOT sent on add.** Sending them previously caused add-owner to fail.

**Fields sent on add:**

```
Business Phone, Type, Title, Percent Owned, Entity Name, First Name, Last Name,
E-mail, Address Line 1, Unit Type, Unit/Suite/Apt, Country, City, State, ZIP Code/Province Postal Code
```

Plus top-level `fein`, `ssn`, `parentRefNbr` in the request body (unchanged).

### Edit owner (`POST /api/edit-owner`)

- `OwnerDetailsCard` maps many new form fields to Accela keys in `fieldMap`.
- **Verify** Accela `API_EDIT_OWNER_INFO` accepts each new key before relying on edit persistence for new fields.

### Full payload helper

- `buildOwnerPayload()` in `ownerPayload.ts` maps all UI fields (for future use / edit alignment).
- Not used for add requests.

## Merge checklist

Before merging into `main`:

- [ ] Other ticket work is merged to `main` first (if required)
- [ ] Smoke-test add Individual owner
- [ ] Smoke-test add Organization owner
- [ ] Smoke-test edit owner (confirm which new fields persist)
- [ ] Confirm `backend/authentication.js` still uses env vars — **do not merge hardcoded credentials**
- [ ] Decide fate of `dev` branch (delete or keep)
- [ ] Open PR: `feature/accela-contact-forms` → `main`

### Suggested merge commands

```bash
git checkout main
git pull origin main
git merge feature/accela-contact-forms
# resolve conflicts if any
git push origin main
```

## Follow-up work (discussed, not in `94251e1`)

These were explored in development chat but are **not** in the committed feature branch unless added in later commits:

1. **DOB only for Property Owner** — show DOB when Type of Entity = `Property Owner`
2. **18+ age validation** — block save if under 18 (added, then removed per request)
3. **DOB required for Property Owner** — validation removed per request

If any of the above is still required before merge, implement on `feature/accela-contact-forms` and add commits here.

## Excluded from this feature (intentionally)

- `backend/authentication.js` hardcoded credentials (left uncommitted)
- `my-app/tsconfig.tsbuildinfo` build artifact
- `my-app/dist/` build output

## Local dev

```bash
# Backend (port 3001)
cd backend && node server.js

# Frontend (port 3000, proxies /api → 3001)
cd my-app && npm run dev
```

Open http://localhost:3000/

---

*Last updated: June 2026*
