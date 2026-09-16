# Connecting to Accela REST APIs and Executing EMSE Scripts

> **Audience:** AI agents (or developers) with **zero prior Accela knowledge**.
> **Goal:** Authenticate against the Accela Cloud APIs and run server-side **EMSE scripts** to read/write data, returning JSON to your application.
>
> This guide is based on the actual working integration in this repository (`backend/`), plus the relevant Accela platform concepts you need to understand it.

---

## 1. Background: What is Accela and what is EMSE?

You do not need to be an Accela expert, but you must understand three terms:

| Term | What it means |
|------|----------------|
| **Accela Civic Platform** | A government/agency SaaS used for licensing, permitting, and case management. Your "data" lives here as **records** (also called Cap/CAP = "Capability"). |
| **Accela Construct API** | The public **REST API** hosted at `https://apis.accela.com`. You authenticate via OAuth 2 and then call endpoints. |
| **EMSE** | "Event Manager Script Engine." EMSE scripts are **JavaScript-like scripts that run *inside* Accela's servers**. They have direct access to Accela data via the `aa.*` API (e.g. `aa.env.getValue(...)`). |

### Why use EMSE scripts instead of the standard REST endpoints?

The standard Accela REST API (e.g. `GET /v4/records`) is generic and limited. For complex/custom business logic (custom SQL lookups, multi-step writes, custom JSON shaping), the pattern in this project is:

1. An administrator writes a **custom EMSE script** inside Accela and gives it a name (e.g. `API_GET_OWNER_INFO`).
2. Your application calls a special REST endpoint, `POST /v4/scripts/{SCRIPT_NAME}`, which **executes that EMSE script** and returns whatever JSON the script produces.

> **Key mental model:** You are not calling a normal database. You are remotely triggering a named server-side script and passing it parameters. The script does the work and hands you back JSON.

---

## 2. The two-step flow (every single request)

```
Step 1: Get an OAuth access token   ->  POST https://apis.accela.com/oauth2/token
Step 2: Execute a named EMSE script ->  POST https://apis.accela.com/v4/scripts/{SCRIPT_NAME}
```

You must do **Step 1 first** to get a token, then pass that token in the `Authorization` header of **Step 2**.

---

## 3. Step 1 — Authentication (OAuth 2 password grant)

Accela uses **OAuth 2**. This project uses the **password grant** flow (a.k.a. "resource owner password credentials"), which is appropriate for trusted server-to-server / backend usage.

### Endpoint

```
POST https://apis.accela.com/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

### Body parameters (form-encoded, NOT JSON)

| Parameter | Description | Example / Source |
|-----------|-------------|------------------|
| `grant_type` | Always `password` for this flow | `password` |
| `client_id` | Your registered app's ID (from Accela Developer Portal) | env: `ACCELA_CLIENT_ID` |
| `client_secret` | Your registered app's secret | env: `ACCELA_CLIENT_SECRET` |
| `username` | Accela user account login | env: `ACCELA_USERNAME` |
| `password` | Accela user account password | env: `ACCELA_PASSWORD` |
| `agency_name` | The Accela agency/tenant code | env: `ACCELA_AGENCY` |
| `environment` | The Accela environment (e.g. `PROD`, `TEST`, `SUPP`) | env: `ACCELA_ENVIRONMENT` |
| `scope` | The permission scope requested. **Must include the EMSE execution scope.** | env: `ACCELA_SCOPE` (default `run_emse_script`) |

> **Critical:** The `scope` value **`run_emse_script`** is what authorizes you to execute EMSE scripts. Without it, Step 2 will fail with an authorization error.

### Response

A JSON object containing the token:

```json
{
  "access_token": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "token_type": "bearer",
  "expires_in": 86399,
  "scope": "run_emse_script",
  "refresh_token": "..."
}
```

Use the `access_token` value for Step 2. Tokens expire (see `expires_in`, in seconds), so request a fresh one as needed.

### Reference implementation (from this repo)

See `backend/authentication.js`:

```javascript
const axios = require('axios');
require('dotenv').config();

const CONFIG = {
  username: process.env.ACCELA_USERNAME,
  password: process.env.ACCELA_PASSWORD,
  agency: process.env.ACCELA_AGENCY,
  environment: process.env.ACCELA_ENVIRONMENT,
  scope: process.env.ACCELA_SCOPE || "run_emse_script"
};

const getAccessToken = async () => {
  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'password');
  tokenParams.append('client_id', process.env.ACCELA_CLIENT_ID);
  tokenParams.append('client_secret', process.env.ACCELA_CLIENT_SECRET);
  tokenParams.append('username', CONFIG.username);
  tokenParams.append('password', CONFIG.password);
  tokenParams.append('agency_name', CONFIG.agency);
  tokenParams.append('environment', CONFIG.environment);
  tokenParams.append('scope', CONFIG.scope);

  const authResponse = await axios.post(
    'https://apis.accela.com/oauth2/token',
    tokenParams,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return authResponse?.data?.access_token; // <-- the token string
};

module.exports = { getAccessToken };
```

---

## 4. Step 2 — Executing an EMSE script

### Endpoint

```
POST https://apis.accela.com/v4/scripts/{SCRIPT_NAME}
Authorization: <access_token>
Content-Type: application/json
```

- `{SCRIPT_NAME}` is the **exact name** the Accela administrator gave the EMSE script. It is case-sensitive and must match precisely. In this project the convention is `API_*` (e.g. `API_GET_OWNER_INFO`).
- **All EMSE scripts are triggered with `POST`**, even if conceptually they "read" or "delete" data.
- The **JSON request body** contains the input parameters the script expects.

> **Authorization header note:** This project passes the raw token string directly as the `Authorization` header value (e.g. `Authorization: <token>`). Some Accela setups expect `Authorization: Bearer <token>`. If you get a 401, try prefixing with `Bearer `.

### How parameters reach the script

Each key in your JSON body becomes available **inside the EMSE script** via:

```javascript
aa.env.getValue("yourKeyName")
```

So if you POST `{ "referenceNumbers": "123,456" }`, the script reads it with `aa.env.getValue("referenceNumbers")`. **The JSON keys must match exactly what the script expects.**

### Response shape

The script returns JSON. The outer envelope from Accela typically wraps the script's own output, so you often need to dig in. Observed shapes in this repo:

- `response.data.result.result.messages` (edit script)
- `response.data.result.result.parents` (reverse-relation script)

> **Important:** The exact nesting (`data.result.result.X`) depends on how the individual EMSE script packages its output and the Construct API version wrapper. **Always log the full raw response once** for a new script to learn its shape, then index accordingly. Do not assume the path.

### Reference implementation (from this repo)

See `backend/reverseRelation.js`:

```javascript
const { getAccessToken } = require('./authentication');
const axios = require('axios');

const accessToken = await getAccessToken();

const scriptResponse = await axios.post(
  'https://apis.accela.com/v4/scripts/API_GET_REVERSE_RELATIONS',
  {
    "referenceNumbers": cleanRefs   // becomes aa.env.getValue("referenceNumbers") in EMSE
  },
  {
    headers: {
      'Authorization': accessToken,
      'Content-Type': 'application/json'
    }
  }
);

// Dig into the script's output envelope:
const accelaData = scriptResponse.data?.result?.result?.parents || [];
```

---

## 5. Complete minimal example (copy-paste starting point)

A self-contained Node.js function that authenticates and runs any named EMSE script:

```javascript
const axios = require('axios');

async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.ACCELA_CLIENT_ID,
    client_secret: process.env.ACCELA_CLIENT_SECRET,
    username: process.env.ACCELA_USERNAME,
    password: process.env.ACCELA_PASSWORD,
    agency_name: process.env.ACCELA_AGENCY,
    environment: process.env.ACCELA_ENVIRONMENT,
    scope: process.env.ACCELA_SCOPE || 'run_emse_script',
  });

  const { data } = await axios.post(
    'https://apis.accela.com/oauth2/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data.access_token;
}

/**
 * Execute a named Accela EMSE script.
 * @param {string} scriptName  Exact EMSE script name, e.g. "API_GET_OWNER_INFO"
 * @param {object} payload     Keys map to aa.env.getValue("key") inside the script
 */
async function runEmseScript(scriptName, payload = {}) {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `https://apis.accela.com/v4/scripts/${scriptName}`,
    payload,
    {
      headers: {
        Authorization: token,           // try `Bearer ${token}` if you get 401
        'Content-Type': 'application/json',
      },
    }
  );
  return data; // inspect/log this to learn the exact nesting for your script
}

// Usage:
// const result = await runEmseScript('API_GET_OWNER_INFO', {
//   "name": "Acme LLC",
//   "reference number": "BUS-2024-001",
//   "nvBusinessID": "NV12345"
// });
```

### Equivalent raw cURL

```bash
# Step 1: get token
curl -X POST https://apis.accela.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$ACCELA_CLIENT_ID" \
  -d "client_secret=$ACCELA_CLIENT_SECRET" \
  -d "username=$ACCELA_USERNAME" \
  -d "password=$ACCELA_PASSWORD" \
  -d "agency_name=$ACCELA_AGENCY" \
  -d "environment=$ACCELA_ENVIRONMENT" \
  -d "scope=run_emse_script"

# Step 2: run a script (paste the access_token from Step 1)
curl -X POST https://apis.accela.com/v4/scripts/API_GET_OWNER_INFO \
  -H "Authorization: <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Acme LLC", "reference number": "BUS-2024-001", "nvBusinessID": "NV12345" }'
```

---

## 6. Required configuration (environment variables)

Create a `.env` file in `backend/` (it is git-ignored — never commit real credentials). These are loaded via `dotenv`.

```dotenv
# OAuth app credentials (from the Accela Developer Portal)
ACCELA_CLIENT_ID=your_app_client_id
ACCELA_CLIENT_SECRET=your_app_client_secret

# Accela user account credentials
ACCELA_USERNAME=your_accela_username
ACCELA_PASSWORD=your_accela_password

# Tenant / environment selectors
ACCELA_AGENCY=YOUR_AGENCY_CODE
ACCELA_ENVIRONMENT=PROD            # or TEST / SUPP, depending on your agency

# Permission scope — must allow EMSE execution
ACCELA_SCOPE=run_emse_script
```

| Variable | Where to get it |
|----------|-----------------|
| `ACCELA_CLIENT_ID` / `ACCELA_CLIENT_SECRET` | Register an app at the Accela Developer Portal (`developer.accela.com`). |
| `ACCELA_USERNAME` / `ACCELA_PASSWORD` | A valid Accela user login with permission to run the scripts. |
| `ACCELA_AGENCY` | Your agency code (ask your Accela administrator). |
| `ACCELA_ENVIRONMENT` | The environment name for that agency (e.g. `PROD`, `TEST`). |
| `ACCELA_SCOPE` | Keep `run_emse_script` to allow script execution. |

---

## 7. EMSE scripts currently used in this project

These are the named scripts this app triggers. Each must exist (with the exact name) inside the Accela agency. The "Body keys" are what you must send; inside the EMSE script they are read via `aa.env.getValue(...)`.

| Script name | Purpose | Body keys sent | Defined in |
|-------------|---------|----------------|------------|
| `API_GET_OWNER_INFO` | Look up ownership info | `name`, `reference number`, `nvBusinessID` | `backend/server.js` |
| `API_ADD_OWNER_INFO` | Add an owner | `newAsitArr`, `fein`, `ssn`, `parentRefNbr` | `backend/add.js` |
| `API_EDIT_OWNER_INFO` | Edit an owner | `editArray`, `editRefNbr`, `parentRefNbr` | `backend/edit.js` |
| `API_DELETE_OWNER_INFO` | Delete an owner | `referenceNbr`, `parentRefNbr` | `backend/delete.js` |
| `API_GET_LIC_OWNERSHIP_TITLES` | Get standard-choice ownership titles | *(none — empty `{}`)* | `backend/getEntity.js` |
| `API_GET_REVERSE_RELATIONS` | Get parent records for given references | `referenceNumbers` (comma-separated string) | `backend/reverseRelation.js` |

> Note: some body keys contain spaces (e.g. `"reference number"`). Send them exactly as written — the EMSE script reads them by that exact string.

---

## 8. Step-by-step checklist for an AI agent

1. **Confirm credentials exist.** Ensure all `ACCELA_*` environment variables (Section 6) are set. If any are missing, you cannot authenticate — stop and request them.
2. **Get a token.** `POST /oauth2/token` (form-encoded, Section 3). Extract `access_token`.
3. **Identify the script name.** Use an existing one from Section 7, or get the exact name from an Accela administrator. The name is case-sensitive.
4. **Identify the expected body keys.** Each maps to `aa.env.getValue("key")` inside the script. Wrong/missing keys = wrong results.
5. **Execute.** `POST /v4/scripts/{SCRIPT_NAME}` with `Authorization: <token>` and the JSON body.
6. **Parse the response.** Log the full raw JSON the first time to discover the nesting (commonly `data.result.result.<field>`), then index into it.
7. **Handle errors** (Section 9). On `401`, re-auth and/or try `Bearer ` prefix. Surface `error.response.data` for diagnostics.

---

## 9. Error handling & troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 Unauthorized` on `/oauth2/token` | Bad `client_id`/`secret`/`username`/`password`, or wrong `agency_name`/`environment` | Verify every credential; agency & environment are case/format-sensitive. |
| `401` / "not authorized" on `/v4/scripts/...` | Token lacks `run_emse_script` scope, token expired, or header format | Ensure `scope=run_emse_script`; refresh token; try `Authorization: Bearer <token>`. |
| `404` on `/v4/scripts/{NAME}` | Script name misspelled or doesn't exist in that environment | Match the name exactly; confirm the script is deployed in the target environment. |
| Script runs but returns empty/odd data | Wrong body keys, or reading the wrong path in the response | Match keys to `aa.env.getValue(...)`; log full response to find the real path. |
| Works in `TEST` but not `PROD` (or vice versa) | Script not deployed to that environment, or different `ACCELA_ENVIRONMENT` | Deploy/verify the script per environment; set the correct `environment`. |

**Always capture errors as `error.response?.data || error.message`** — Accela returns useful detail in the response body, as the existing routes do.

---

## 10. Security notes

- **Never commit `.env` or credentials.** The repo's `.gitignore` excludes env files.
- Treat the access token as a secret; do not log it.
- Run script execution from a **trusted backend**, never directly from a browser/client (which would expose credentials). In this project, the React frontend (`my-app/`) calls the Node backend (`backend/`, port `3001`), and only the backend talks to Accela.

---

## 11. Quick reference

```
Auth:   POST https://apis.accela.com/oauth2/token
        Content-Type: application/x-www-form-urlencoded
        body: grant_type, client_id, client_secret, username, password,
              agency_name, environment, scope=run_emse_script
        -> access_token

Run:    POST https://apis.accela.com/v4/scripts/{SCRIPT_NAME}
        Authorization: <access_token>   (or "Bearer <access_token>")
        Content-Type: application/json
        body: { "paramName": value, ... }   -> aa.env.getValue("paramName")
        -> JSON (commonly under data.result.result.<field>)
```
