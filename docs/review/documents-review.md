# Backend Documentation Review

## 1. Overview
- Frontend implementation (Expo Router + multi-tab UI) is significantly ahead of parts of the documentation set. Several specs still describe the early YouTube-clone prototype, while others assume a full AWS/Fastify backend. The conflicting narratives need alignment before implementation starts.

## 2. Functional Specification Review
- **Outdated scope**: `docs/frontend-spec.md:12-190` only covers a 4-screen MVP (home/list, watch, upload, auth) and references routes like `/upload` that no longer exist. The shipping frontend includes Netflix, Shorts, playlists, live, creation hub, etc. (`frontend/app/(tabs)/netflix.tsx:1-160`, `frontend/app/creation/index.tsx:1-120`, `frontend/app/upload-video.tsx:1-120`). Update the spec to reflect the current IA and flows.
- **Route mismatch**: The spec still calls out separate `/login` and `/register` pages, but the app ships a combined `/auth` screen with tabbed forms (`frontend/app/auth.tsx:1-200`). Downstream API/test docs inherit the wrong URLs, causing inconsistencies in E2E plans.
- **Architecture wording drift**: The architecture overview depicts a Next.js web client (`docs/specs/architecture/system-overview.md:21-28`), while the actual repo is Expo (`frontend/app.json:1-32`). Clarify whether a separate Next.js client is in-scope or align the system overview with the current stack.

## 3. Ancillary Documents (Concept/Tech)
- **Conflicting platform strategy**: `docs/video.md:33-70` and `docs/tech.md:7-25` describe a minimal Supabase + Bunny.net backend and defer comments/playlists/live as “later,” yet the feature specs/implementation plan assume a large-scale AWS build with those features included. Decide which vision is authoritative.
- **Platform switch design**: `docs/switch.md:13-18` hardcodes Supabase RLS for adult filtering, but the architecture specs move to PostgreSQL/RDS (`docs/specs/architecture/system-overview.md:43-188`). Update the switch strategy to match the chosen stack (e.g., Postgres RLS or service-layer filters) and capture backend responsibilities explicitly.

## 4. Implementation Plan
- **Stack mismatch**: The plan (e.g., `docs/implementation/README.md:63-108`) locks in Fastify, Prisma, AWS MediaConvert, Redis, etc., contradicting the Supabase-based docs above. Confirm the final target stack before execution to avoid rework.
- **Web client assumption**: Multiple sections mention Next.js fronts (e.g., mermaid diagram nodes, `docs/implementation/README.md:90-108`), but only an Expo client exists. Either plan for an additional web app or fix the references.
- **Delivery risk**: The plan promises 10k concurrent users, 99.9% SLA, dual payment providers, live, recommendation, etc., in 16 weeks (`docs/implementation/IMPLEMENTATION-PLAN-OVERVIEW.md:31-75`). There’s no risk buffer for compliance (CCBill onboarding), media pipeline complexity, or search relevance tuning. Recommend adding phased acceptance criteria and explicit risk mitigation before execution.

## 5. Test Specifications & Report
- **E2E flow mismatch**: Authentication E2E cases expect Playwright to hit `/register` and `/login` with web selectors (`docs/tests/authentication-tests.md:546-580`), which the Expo app does not expose. Similar assumptions likely appear elsewhere—reconcile the test plan with the actual UI routing/components.
- **Undefined environment strategy**: Tests lean on Playwright + k6 + Supertest but no environment/story for running Expo web, MediaConvert mocks, or multi-provider payment sandboxes is captured. Document the environment matrix and data seeding expectations so the tests become actionable.
- **Test-report claims**: The summary asserts 100% completion and target coverage (`docs/tests/TEST-SUMMARY-REPORT.md:7-20`), yet many flows rely on unimplemented infrastructure. Mark planned vs. executable tests and call out prerequisites (streams, signed URLs, recommendation signals) to avoid false confidence.

## 6. Recommendation
- Do **not** start backend implementation until the spec set converges on a single architecture and the functional spec reflects the current frontend. Resolve the Supabase vs. AWS direction, update route maps, and revisit the implementation/test plans with realistic scope/risks. Once aligned, re-baseline the test plan against the corrected flows and environments.
