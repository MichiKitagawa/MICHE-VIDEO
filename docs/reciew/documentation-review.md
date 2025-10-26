# Documentation Review (Post-Update)

## Findings

1. **Architecture still assumes a dedicated Next.js client** *(High)*  
   - Evidence: `docs/specs/architecture/system-overview.md:21-40`, `docs/specs/architecture/system-overview.md:666-677`, `docs/specs/architecture/tech-stack.md:25`.  
   - Reality: the repository ships a single Expo Router app that serves mobile + web (`frontend/app/_layout.tsx:1-12`, `frontend/app.json:1-32`). No Next.js project exists, so planning and capacity estimates targeting two distinct clients are misleading.  
   - Impact: API/interface contracts, delivery scope, and staffing are being sized for a web stack that is not present. Backend decisions (SSR, hydration, SWR cache policy) get anchored to phantom requirements.  
   - Recommendation: Rewrite the system overview/tech stack to name the actual Expo targets (native + Expo web) or explicitly add a work item for a separate Next.js client with scope, effort, and timelines.

2. **Authentication specs/tests reference nonexistent `/login` & `/register` routes** *(High)*  
   - Evidence: `docs/specs/features/01-authentication.md:9-60`, `docs/tests/authentication-tests.md:546-589`, `docs/report/backend-blueprint.md:32`.  
   - Reality: the frontend exposes a single `/auth` screen with tabbed login/signup (`frontend/app/_layout.tsx:6-11`, `frontend/app/auth.tsx:1-60`).  
   - Impact: Back-end endpoints, redirects, and E2E automation are designed around paths the client will never call. If implemented as written, auth flows would 404 and the planned Playwright suite cannot execute against the Expo web output.  
   - Recommendation: Update the functional spec, blueprint, and every test case to target `/auth` (with tab state) and adjust redirect expectations accordingly.

3. **Deprecated payment provider (`epoch`) still documented as expected** *(Medium)*  
   - Evidence: `docs/report/backend-blueprint.md:115-118` states the frontend "assumes" Epoch support and prescribes a 501 strategy.  
   - Reality: Epoch was removed from the type system and payment helper (`frontend/types/index.ts:437-459`, `frontend/utils/paymentProvider.ts:1-60`).  
   - Impact: Keeping Epoch in the canonical blueprint risks re-introducing it into the backlog/spec despite the cleanup, causing churn in API contracts and QA scope.  
   - Recommendation: Remove Epoch from the blueprint (and any other specs) or move it to a clearly marked "future consideration" section detached from current deliverables.

4. **Implementation plan remains over-scoped for the proposed 16-week schedule** *(Medium)*  
   - Evidence: `docs/implementation/IMPLEMENTATION-PLAN-OVERVIEW.md:7-97` and Phase 4 exit criteria demand fully functional live streaming (OBS ingest, low-latency chat), full-text search/recommendation on Elasticsearch, Netflix-style catalogs, dual payment providers, and 10k concurrent load with 99.9% SLA within four months.  
   - Impact: Even with the risk tables later in the doc, the plan offers no contingency for compliance (CCBill onboarding), media pipeline hardening, or search relevance tuning. This creates a high probability of deadline slips or scope cuts midstream.  
   - Recommendation: Re-baseline the roadmap—separate foundational MVP (auth + upload + playback + single provider) from stretch goals, and add explicit decision gates for high-risk capabilities (MediaLive, recommendation engine, Premium+ billing).

5. **Test readiness is overstated** *(Medium)*  
   - Evidence: `docs/tests/TEST-SUMMARY-REPORT.md:7-39` claims 100% completion/coverage, yet the detailed auth E2E example still targets `/register`/`/login` and browser selectors (`docs/tests/authentication-tests.md:552-589`).  
   - Impact: Reporting "complete" coverage while the scenarios call non-existent routes provides false confidence and masks the work required to adapt the suites to Expo web builds (routing, selectors, auth flow).  
   - Recommendation: Reclassify the summary as "draft" or "in progress", update the scenarios to the current UI, and document the environment matrix (Expo web build vs. native, mocked MediaConvert/Stripe/CCBill endpoints) before implementation starts.

## Readiness Assessment

The documentation set still contains conflicting assumptions about the frontend architecture and key user flows. Until the auth specs/tests are aligned with the actual `/auth` screen and the system overview/blueprint stop targeting a non-existent Next.js client (or scope that client explicitly), the backend team risks building the wrong integration points. Likewise, the implementation plan and test summaries need to be grounded in achievable milestones to avoid downstream schedule shocks.

**Recommendation:** Hold backend implementation kickoff until the above corrections are merged and the project scope is re-confirmed with stakeholders.

