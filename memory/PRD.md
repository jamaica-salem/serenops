# Panze — AI-First Project Management (Jira-lite)

## Original problem statement
Build a modern AI-first project management web app (Jira-lite) for internal company use. Linear/Notion-style soft UI, orange accent on neutral light background, card-based dashboard, AI chat assistant + AI-driven notifications + per-user LLM settings.

## User-confirmed choices (Apr 2026)
- Stack: FastAPI + React (JSX) + MongoDB
- Auth: JWT email/password (httpOnly cookies)
- AI: rule-based default + real LLM via provider APIs (per-user override)
- Demo data seeded on first boot

## Architecture
- Backend modular routers under `/api/*` (auth, tasks, projects, notifications, dashboard, meetings, llm-config, chat)
- Frontend `AppLayout` (Sidebar + TopBar + Outlet) wraps protected pages
- Floating AI chat (`AIChatPanel`) available on every screen
- Per-user LLM config stored in `db.llm_configs`

## User personas
- **Project member** (default): tracks own tasks, queries AI, sees notifications.
- **Admin**: same plus future cross-team controls (basic seeded role today).

## Core requirements (static)
- Dashboard with 6 cards: My Tasks, Projects Overview (donut), AI Insights, Meetings, Task Progress (bars), Open Tickets
- Tasks: List + Kanban; CRUD; filter by status/project
- Projects: cards CRUD with color
- Notifications: rule-based (overdue / due-soon / AI alert)
- Settings: provider (OpenAI/Anthropic/Gemini/Custom) + model + API key
- AI Chat: rule-based fallback + LLM via provider APIs

## Implemented (Apr 29, 2026)
- ✅ Backend modular FastAPI app with 8 routers; bcrypt + JWT auth via cookies
- ✅ Seed: admin@panze.app/admin123, demo@panze.app/demo123, 3 teammates, 4 projects, 12 tasks, 3 meetings
- ✅ Dashboard `summary` endpoint with rule-based AI insights
- ✅ Chat endpoint: tries configured LLM first → falls back to rule-based
- ✅ Frontend: Login, Register, Dashboard, Tasks (List+Kanban), Projects, Notifications, Settings, AI Assistant page, floating AI chat panel
- ✅ Manrope/Inter typography, orange accent design system, all interactive elements have data-testid
- ✅ Tested: 21/21 backend pytest passing; frontend e2e flows green

## Implemented (Iteration 2 — Apr 29, 2026)
- ✅ **Drag-and-drop Kanban** via `@dnd-kit/core + sortable` — drop on any column → PATCH /api/tasks/{id}
- ✅ **Persisted notifications** — same IDs across calls, auto-resolves done/moved tasks; PATCH `/{id}/read`, POST `/read-all`, DELETE `/{id}`
- ✅ **`GET /api/users`** — assignee dropdowns in TaskFormDialog and avatars in Tasks list & dashboard
- ✅ **Brute-force lockout** — 5 fails / 15 min per IP+email, 429 response, cleared on success
- ✅ **Cookie hardening** — `COOKIE_SECURE` + `COOKIE_SAMESITE` env vars wired to `set_auth_cookies`
- ✅ Tested: 30/30 backend pytest, 100% frontend

## Backlog (P1/P2)


- **P1** — Lift unread notification count to context (TopBar bell only refreshes on mount)
- **P2** — Comments / activity log on tasks
- **P2** — Calendar view + Gantt
- **P2** — Real meeting integrations (Google Meet / Zoom links)
- **P2** — "Sticky dismiss" for rule-based notifications (currently re-emerge next GET)

## Next tasks
1. Optional: Weekly AI Standup digest (proactive engagement)
2. Optional: Comments + @mentions
3. Optional: Calendar/timeline view
