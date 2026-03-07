# HundredUsers — Progress

## Goal

Building a full UI for the "hundredusers" GTM (Go-To-Market) campaign platform. The three-stage UX flow is: (1) Auth login/signup, (2) Ask-driven onboarding form, (3) Dashboard home with project management. Work is on the `ui` git branch.

---

## Instructions / Conventions

- **pnpm** as the package manager (not npm)
- **shadcn base-lyra** style — uses `@base-ui/react` primitives; components use `render` prop (not `asChild`)
- **Auth0** for auth — `@auth0/auth0-react` + `convex/react-auth0`
- **@remixicon/react** for icons
- **Zod v4** (4.3.6) — needs `as any` cast with `@hookform/resolvers/zod`
- **Convex** for backend (schema, queries, mutations)
- **Backboard SDK** (`backboard-sdk`) for conversational AI — server-side only (uses `node-fetch`, `fs`, `path`)
- Chat sessions persist in Convex, bound by user ID
- Streaming responses via SSE from API routes to browser
- Assistant and thread creation is on-the-fly (no pre-created assistant ID)
- User must add `BACKBOARD_API_KEY` to `.env.local`

---

## Discoveries

1. **Base-lyra shadcn components** don't use `asChild` — they use `render` prop (e.g., `SidebarMenuButton render={<Link href="..." />}`) or accept children directly.
2. **Convex codegen** must be run (`npx convex codegen`) after schema changes to regenerate `convex/_generated/` types.
3. The **shadcn sidebar component** provides `SidebarProvider`, `Sidebar` (with `collapsible="icon"` support), `SidebarTrigger`, `SidebarRail`, `SidebarInset`, and full menu/group components.
4. **Backboard SDK** is **server-side only** — must proxy through Next.js API Route Handlers.
5. **Backboard SDK API signatures**:
   - `new BackboardClient({ apiKey })`
   - `client.createAssistant({ name, system_prompt })` → `Promise<Assistant>` (has `.assistantId`)
   - `client.createThread(assistantId)` → `Promise<{ threadId }>`
   - `client.addMessage(threadId, { content, stream, memory })` → streaming returns `AsyncGenerator`
6. **Backboard streaming chunks**: The SDK emits incremental content-delta chunks (`{ content: "..." }`, no `role` field) during streaming, then final summary chunks with `role: "user"` (echo) and `role: "assistant"` (full message). Both summary chunks must be filtered out server-side to prevent content duplication on the client.
7. **`TooltipProvider`** lives inside `ConvexClientProvider.tsx` (client boundary).
8. **React hooks rules**: Never call `router.replace()` during render — use `useEffect`. Early returns must come after all hooks to avoid "Rendered fewer/more hooks" errors.

---

## Completed

### Foundation (earlier commits)

- Created `ui` git branch
- Installed 16+ shadcn components (card, input, label, tabs, separator, alert, textarea, badge, dropdown-menu, avatar, skeleton, sonner, select, checkbox, sheet, dialog, sidebar, tooltip)
- Installed `react-hook-form` and `@hookform/resolvers` via pnpm
- Created Convex schema (`convex/schema.ts`) with `users` and `projects` tables
- Created Convex functions (`convex/users.ts`, `convex/projects.ts`)
- Created auth layout, login page, dashboard layout/page, project page
- Created shared components: `user-menu.tsx`, `app-sidebar.tsx`, `app-header.tsx`

### Sidebar rewrite

- Rewrote `components/app-sidebar.tsx` to use shadcn `Sidebar` with `collapsible="icon"` mode, logo header, main nav (Dashboard, Chat), pipeline section (Research, Leads, Outreach), and user menu in footer
- Rewrote `components/app-header.tsx` to use `SidebarTrigger` + separator
- Updated dashboard and projects layouts to use `SidebarProvider` + `AppSidebar` + `SidebarInset`
- Added `TooltipProvider` to `app/ConvexClientProvider.tsx`

### Chat feature (`/chat`)

- Created `convex/schema.ts` additions — `chatThreads` and `chatMessages` tables with indexes
- Created `convex/chat.ts` — createThread, listThreads, getThread, updateThread, deleteThread, saveMessage, listMessages (all with user ownership checks)
- Created `app/api/chat/route.ts` — POST handler proxying Backboard SDK with SSE streaming, on-the-fly assistant/thread creation, metadata event, content streaming, error handling
- Created `app/(app)/chat/layout.tsx` — chat route layout with SidebarProvider shell
- Created `app/(app)/chat/page.tsx` — full chat UI with thread sidebar, message display, streaming, auto-scroll, auto-resize textarea, stop streaming, Convex persistence
- Added Chat link to sidebar navigation

### Onboarding chat integration

- Created `app/api/onboarding-chat/route.ts` — dedicated Backboard API route with onboarding-specific system prompt that extracts structured fields (name, goals, product description, target audience) as JSON
- Rewrote onboarding Step 1 "Ask" (`app/(app)/onboarding/page.tsx`) as a mini chat interface with:
  - Streaming responses from Backboard via `/api/onboarding-chat`
  - JSON extraction from assistant responses to pre-fill onboarding form
  - Extracted-fields confirmation card with "Continue with these details" button
  - "Skip and fill in manually" link for users who prefer the form directly
  - Stop streaming button, error handling, auto-scroll, auto-resize textarea
- Pre-fills Step 2 form with AI-extracted fields when user clicks "Continue"
- Step 2 description updates contextually when fields were AI-extracted

### Bug fixes

- **Streaming duplication fix**: Both `/api/chat/route.ts` and `/api/onboarding-chat/route.ts` filter out any chunk with a `role` field (user echo + assistant summary) to prevent content duplication
- **Chat page sync fix**: `persistedMessages` useEffect guarded with `!isStreaming` to prevent mid-stream duplication
- **Onboarding redirect fix**: Moved `router.replace("/dashboard")` from render into `useEffect` to fix React hooks rules violations ("Cannot update Router while rendering", "Rendered fewer/more hooks")

### Phase 1: Platform Foundation (branch: `phase1-platform-foundation`)

- Extended Convex schema with 9 new tables: `workflowRuns`, `workflowSteps`, `icpProfiles`, `discussionSources`, `painPoints`, `messagingAngles`, `leadLists`, `leads`, `outreachDrafts`
- Created `convex/workflows.ts` — full workflow run/step lifecycle: create, start, complete, fail, cancel runs; start, complete, fail individual steps; query latest run and steps by project
- Created `convex/research.ts` — store and query ICP profiles, discussion sources, and pain points
- Created `convex/messaging.ts` — store and query messaging angles
- Created `convex/leads.ts` — lead list management, lead storage and querying
- Created `convex/outreach.ts` — outreach draft storage, status management, per-lead queries
- Updated `convex/projects.ts` — project creation now auto-initializes a workflow run with all 7 pipeline steps
- Created `lib/validation/schemas.ts` — shared Zod schemas for all agent handoffs (ICP, discovery, pain synthesis, messaging, leads, outreach) with `STEP_DISPLAY` metadata
- Built 6 dashboard panel components: `icp-panel`, `pain-points-panel`, `messaging-panel`, `leads-panel`, `outreach-panel`, plus `workflow-status`, `agent-run-timeline`, `streaming-step-state`
- Rebuilt `projects/[projectId]/page.tsx` as a full campaign dashboard with tabbed panels (Overview, ICP, Pain Points, Messaging, Leads, Outreach, Pipeline), progress bar, agent timeline, and start/re-run pipeline button

---

## File Map

### Configuration

- `package.json` — deps: backboard-sdk, auth0, convex, shadcn, zod, react-hook-form, remixicon
- `components.json` — shadcn config (base-lyra, remixicon, RSC)
- `app/globals.css` — Tailwind v4 CSS with oklch theme variables
- `.env.local` — Convex, Auth0 env vars (**needs `BACKBOARD_API_KEY`**)
- `convex/auth.config.ts` — Auth0 provider config

### Convex Backend

- `convex/schema.ts` — users, projects, chatThreads, chatMessages, workflowRuns, workflowSteps, icpProfiles, discussionSources, painPoints, messagingAngles, leadLists, leads, outreachDrafts
- `convex/users.ts` — getOrCreate, me, completeOnboarding
- `convex/projects.ts` — list, get, create (with workflow init), updateStatus
- `convex/workflows.ts` — createRun, getLatestRun, listRuns, getSteps, getProjectSteps, startRun, completeRun, failRun, cancelRun, updateStep, startStep, completeStep, failStep
- `convex/research.ts` — storeIcpProfiles, getIcpProfiles, storeDiscussionSources, getDiscussionSources, storePainPoints, getPainPoints
- `convex/messaging.ts` — storeMessagingAngles, getMessagingAngles
- `convex/leads.ts` — createLeadList, updateLeadList, storeLeads, getLeads, getLeadLists
- `convex/outreach.ts` — storeDrafts, getDrafts, updateDraftStatus, getDraftsByLead
- `convex/chat.ts` — createThread, listThreads, getThread, updateThread, deleteThread, saveMessage, listMessages

### API Routes

- `app/api/chat/route.ts` — general chat streaming (GTM assistant)
- `app/api/onboarding-chat/route.ts` — onboarding chat streaming (extracts structured fields)

### App Routes

- `app/layout.tsx` — root layout
- `app/page.tsx` — smart redirect based on auth/onboarding state
- `app/ConvexClientProvider.tsx` — Auth0 + Convex + TooltipProvider
- `app/(auth)/layout.tsx` + `app/(auth)/login/page.tsx` — auth flow
- `app/(app)/layout.tsx` — auth guard for app routes
- `app/(app)/onboarding/page.tsx` — 3-step onboarding (Ask chat → Form → Connect)
- `app/(app)/dashboard/layout.tsx` — dashboard shell with SidebarProvider
- `app/(app)/dashboard/page.tsx` — project list with new project dialog
- `app/(app)/projects/layout.tsx` — project shell with SidebarProvider
- `app/(app)/projects/[projectId]/page.tsx` — campaign dashboard with tabbed panels (overview, ICP, pain points, messaging, leads, outreach, pipeline)
- `app/(app)/chat/layout.tsx` — chat shell with SidebarProvider
- `app/(app)/chat/page.tsx` — full chat UI with persistence

### Components

- `components/app-sidebar.tsx` — shadcn Sidebar (Dashboard, Chat, Pipeline nav, user menu footer)
- `components/app-header.tsx` — SidebarTrigger + separator
- `components/user-menu.tsx` — unused (can be deleted)
- `components/workflow-status.tsx` — vertical step timeline + horizontal progress bar for pipeline
- `components/agent-run-timeline.tsx` — compact horizontal agent execution timeline
- `components/streaming-step-state.tsx` — pulsing loading indicator for active pipeline steps
- `components/icp-panel.tsx` — ICP segment cards with roles, industries, challenges
- `components/pain-points-panel.tsx` — pain point cards with evidence snippets and source links
- `components/messaging-panel.tsx` — messaging angle cards with hooks and CTAs
- `components/leads-panel.tsx` — lead list with contact details and action links
- `components/outreach-panel.tsx` — outreach draft cards with copy-to-clipboard
- `components/ui/` — all shadcn UI primitives

### Validation / Contracts

- `lib/validation/schemas.ts` — shared Zod schemas for all agent handoffs (ICP, discovery, pain points, messaging, leads, outreach)
- `lib/validation/index.ts` — barrel export

---

## Still TODO

- Delete unused `components/user-menu.tsx`
- End-to-end testing of chat and onboarding flows
- Gmail OAuth implementation (currently a placeholder button)
- Pipeline pages (Research, Leads, Outreach) — placeholder routes
- **Phase 2**: Research agent system (ICPAgent, Exa discovery, Reddit scraping, Browserbase/Puppeteer, pain-point clustering)
- **Phase 3**: Campaign agent system (MessagingAgent, Apollo/Apify leads, OutreachAgent)
- **Phase 4**: Hardening (retries, regeneration, observability, dedup, trust scoring)
