# CareerLens AI — Full Audit Report

Generated: 2025-10-08

---

## Executive Summary

| Category | Status | Notes |
|---|---|---|
| Backend API Health | ✅ PASS | All 5 endpoints return 200 |
| Frontend Build | ✅ PASS | 0 TypeScript errors, 0 build warnings |
| Broken Routes (navigate) | ❌ FAIL | 2 navigates to removed routes in JobMatch.tsx |
| Dead Import Functions (api.ts) | ⚠️ MEDIUM | 2 dead exports never called |
| Hardcoded Mock Data | ⚠️ MEDIUM | scoreWeights + skillEvidence in JobMatch.tsx; HTML string in MarketIntelligence.tsx |
| Backend CollectRequest ordering | ⚠️ MEDIUM | CollectRequest class defined after it's used (Python works at runtime but violates convention; will break type checkers) |
| Dead Page Files on Disk | ⚠️ LOW | 8 unrouted page files still exist |
| Empty-State Handling | ✅ PASS | All 5 pages handle empty data gracefully |
| Null-check safety | ✅ PASS | No unguarded dereferences found |

---

## API Health (Step 1)

| Endpoint | HTTP Status | Result |
|---|---|---|
| GET /api/jobs | 200 | Returns 10 seeded verified_active jobs |
| GET /api/market/skills | 200 | Returns 15 market skill rows |
| GET /api/market/stats | 200 | Returns aggregate stats |
| GET /api/market/statistics | 200 | Returns ~48 provenance rows across 3 sources |
| GET /docs | 200 | Swagger UI loaded |

---

## Issues Found

### CRITICAL

None found. Build is clean, no runtime-crashing null-dereferences detected.

---

### MEDIUM

#### M1 — JobMatch.tsx navigates to removed routes `/optimizer` and `/action-plan`
- **File:** `src/pages/JobMatch.tsx`
- **Lines:** 193–199
- **Problem:** Two `Button` elements call `navigate('/optimizer')` and `navigate('/action-plan')`. Both routes are removed from the router. Clicking them navigates to a broken/empty page.
- **Fix:** Change `/optimizer` → `/resume` (Resume Intelligence is the replacement for optimizer) and `/action-plan` → `/skill-gap` (Skill Gap is the replacement for action plan).

#### M2 — Analytics.tsx navigates to removed route `/career-paths`
- **File:** `src/pages/Analytics.tsx`
- **Line:** 329
- **Problem:** Dead page file, also contains a navigate to the removed `/career-paths` route.
- **Fix:** This is an unrouted dead file; the navigate is inert. Mark as LOW (fixing the file itself is handled under LOW cleanup).

#### M3 — MarketIntelligence.tsx renders raw HTML tags as visible text
- **File:** `src/pages/MarketIntelligence.tsx`
- **Lines:** 81–84
- **Problem:** The subtitle uses a template literal containing `<strong class="text-indigo-300">` which React renders as the literal string `<strong class...>` not as HTML. The user sees `Based on <strong class="text-indigo-300">1,234 analyzed job postings</strong>` as raw text.
- **Fix:** Convert to JSX with `<>Based on <strong className="text-indigo-300">{jobCount} analyzed job postings</strong></>`.

#### M4 — JobMatch.tsx uses hardcoded scoreWeights and skillEvidence (mock data)
- **File:** `src/pages/JobMatch.tsx`
- **Lines:** 11–28
- **Problem:** `scoreWeights` is a static array of hardcoded scores (32/35, 16/20 etc.) that has no connection to the actual job's fit score. `skillEvidence` is a static array mapping skills to resume evidence text from a specific candidate — it is example data, not the user's actual resume. Both are displayed as real analysis results.
- **Fix:** Replace `scoreWeights` with values computed from the real `job.fitScore` and `job.matchedSkills`/`job.missingSkills`. Replace `skillEvidence` with dynamic content based on `job.matchedSkills` and the `resumeAnalysis.extractedProfile` from the store.

#### M5 — api.ts exports two dead functions never called from any active page
- **File:** `src/lib/api.ts`
- **Problem:** `optimizeResumeBullets` (for the removed ResumeOptimizer page) and `generateRecruiterMessage` (for the removed RecruiterMessages page) are still exported. They will never throw at runtime, but they add dead surface area and are confusing.
- **Fix:** Remove both functions from api.ts.

#### M6 — backend/jobs.py: CollectRequest and CollectSource classes defined after their use
- **File:** `backend/app/api/jobs.py`
- **Lines:** 384 (use), 409–417 (definition)
- **Problem:** The `run_job_collection` route at line 384 uses `request: CollectRequest` as a type annotation. In Python, FastAPI resolves route function signatures at startup via inspection, not at definition time, so this works at runtime. However, it fails under strict static analysis tools (mypy, pylint) and is a maintenance hazard.
- **Fix:** Move `CollectSource` and `CollectRequest` class definitions to before the first endpoint that uses them (before the `/collect/run` route).

---

### LOW

#### L1 — 8 dead page files remain on disk, unrouted
- **Files:**
  - `src/pages/ActionPlan.tsx`
  - `src/pages/Analytics.tsx` (also contains a broken navigate to `/career-paths`)
  - `src/pages/ApplicationTracker.tsx`
  - `src/pages/CareerPaths.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/RecruiterMessages.tsx`
  - `src/pages/ResumeOptimizer.tsx`
  - `src/pages/Settings.tsx`
- **Problem:** These files are not imported or routed anywhere. They compile fine, they're just dead code. `Analytics.tsx` also calls `navigate('/career-paths')` internally, but since it's not routed that call is unreachable.
- **Fix:** Delete all 8 files once confirmed no longer needed (already confirmed no imports).

#### L2 — appStore.ts AnalyticsState slice is unused
- **File:** `src/stores/appStore.ts`
- **Problem:** `AnalyticsState` and its actions (`recordApplication`, `recordInterview`, `recordOffer`) are in the store but no active page calls them.
- **Fix:** Remove the analytics slice from the store (deferred, low risk).

#### L3 — api.ts fetchMarketStats and fetchMarketStatistics are both exported but neither is called from an active page
- **File:** `src/lib/api.ts`
- **Problem:** `MarketIntelligence.tsx` uses `fetchMarketSkillsFromDB` and `fetchMarketStatistics` from `supabaseData.ts`, not from `api.ts`. The two functions in `api.ts` are dead exports.
- **Fix:** Remove `fetchMarketStats` and `fetchMarketStatistics` from `api.ts` (already covered under M5 partial; doing separately would also clean these).

#### L4 — mockData.ts and mockData.ts.bak do not exist on disk
- Both files confirmed absent. No action needed.

---

## Fix Log (CRITICAL + MEDIUM)

### Fix M1 — JobMatch.tsx: replace broken navigates
Changed `navigate('/optimizer')` → `navigate('/resume')` and `navigate('/action-plan')` → `navigate('/skill-gap')`.

### Fix M3 — MarketIntelligence.tsx: fix raw HTML in JSX string
Changed template literal with HTML tags to proper JSX with `<strong className>` element.

### Fix M4 — JobMatch.tsx: remove hardcoded scoreWeights and skillEvidence
Replaced static `scoreWeights` with dynamic computation from real job data. Replaced static `skillEvidence` with dynamic evidence from `resumeAnalysis.extractedProfile` in the store.

### Fix M5 — api.ts: remove dead exports
Removed `optimizeResumeBullets` and `generateRecruiterMessage`.

### Fix M6 — backend/jobs.py: move CollectRequest/CollectSource before first use
Moved class definitions to before the `/collect/run` route endpoint.
