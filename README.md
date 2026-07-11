# MaintainIQ — Track B (Supabase, HTML/CSS/Bootstrap/JS)

AI-powered QR maintenance & asset history platform. Built for Batch 18, Track B of the SMIT MaintainIQ hackathon.

## Stack
Plain HTML + Bootstrap 5 + vanilla JS + Supabase (Auth, Postgres, RLS). No build step — just static files.
QR codes via the `qrcode` npm package (loaded from CDN).

## 1. Set up Supabase
1. Create a project at https://supabase.com.
2. Go to **SQL Editor** and run the full contents of `sql/schema.sql`. This creates all tables, RLS policies, the `public_assets` view used by the QR page, and the `next_asset_code()` / `next_issue_number()` helper functions.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.
4. Open `js/supabase-client.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
5. (Optional) In **Authentication → Providers → Email**, turn off "Confirm email" while testing so new accounts can sign in immediately.

## 2. Run it
Any static server works, e.g.:
```bash
npx serve .
# or
python3 -m http.server 5500
```
Open `index.html` → **Create an account** → sign in → you land on `dashboard.html`.

## 3. How the pages map to the brief
| Page | Purpose |
|---|---|
| `index.html` / `register.html` | Supabase Auth login & signup (role stored in `profiles`) |
| `dashboard.html` | Stats, assets needing attention, recent activity |
| `assets.html` | Asset registry — search, filter, register new asset (auto-generates unique `asset_code`) |
| `asset-details.html` | QR preview/download/copy-link, edit asset, status control, related issues, history |
| `public-asset.html?code=AST-0001` | **The QR destination.** No login required. Shows safe fields only (via the `public_assets` view), lets anyone report an issue, and runs client-side AI triage before submission |
| `issues.html` | Internal issue list — search/filter by status & priority |
| `issue-details.html` | AI triage snapshot, technician assignment, enforced status workflow, maintenance notes (parts/cost), asset history |

## 4. AI Issue Triage
`js/ai-triage.js` is a **rule-based structured triage engine** — it's allowed by the Track B brief ("a rule-based issue classifier is acceptable when the trainer has not covered secure AI API integration") and needs zero API keys, so it works out of the box.

To upgrade to a real LLM later without touching the rest of the app:
1. Create a Supabase Edge Function that calls the Anthropic/OpenAI API server-side (key lives in Edge Function secrets, never in frontend code).
2. Replace the body of `runTriage()` in `js/ai-triage.js` with a `fetch()` call to that function, keeping the same return shape:
   ```js
   { title, category, priority, possible_causes, initial_checks, recurring_warning, safety_note, source }
   ```
Everything else (the review-before-submit UI, storage in `issues.ai_suggested`, the `ai_edited` flag) already works either way.

## 5. Business rules already enforced
- Duplicate asset codes rejected (DB unique constraint + auto-generated codes).
- Issue status can only move through the defined workflow (`STATUS_ACTIONS` map in `issue-details.html`); closed issues can only be reopened.
- An issue cannot be marked **Resolved** without at least one maintenance note.
- Maintenance cost cannot be negative (checked client-side and by a DB `check` constraint).
- Every meaningful action (register, status change, assignment, note, issue report) writes to `asset_history` and is not editable from the UI.
- Public page only ever reads from the `public_assets` view — no technician notes, cost, or reporter contact are exposed.

## 6. Still worth doing before submission
- Add a **Reset Demo Data** / seed script if your evaluator wants to see a populated dashboard.
- Wire up real evidence upload (Supabase Storage bucket) — currently `evidence_url` fields exist in the schema but no upload UI is wired in yet.
- Deploy (Vercel/Netlify/GitHub Pages all work since this is static) and add the deployed link + demo credentials to your submission.
