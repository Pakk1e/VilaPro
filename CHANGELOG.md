# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog**, and this project adheres to **Semantic Versioning** where applicable.

---

## [v1.0.0] – Platform Foundation

**Release date:** 2026-01-28

### ✨ Added

* AuthProvider with full authentication lifecycle (login, logout, session rehydration)
* `/api/me` backend endpoint for persistent sessions across reloads
* Role-based access control (user, calendar_user, admin)
* Hub-based routing architecture for standalone widgets
* Login, Hub, and Calendar pages using React Router
* Environment-aware API routing (dev proxy vs production API domain)
* SPA-safe production routing with static fallback handling

### 🔐 Security

* Removed frontend localStorage-based authentication
* Implemented HTTP-only app session cookie
* Preserved secure VillaPro credential handling and automation sessions

### 🧱 Architecture

* Migrated from monolithic SPA to platform-style page structure
* Isolated Calendar as a standalone, production-ready widget
* Removed legacy AuthContext in favor of a single AuthProvider
* Established clean frontend/backend responsibility boundaries

### 🚀 Deployment

* Production-ready Cloudflare Free–compatible setup
* Safe PM2-based deployment flow
* Verified development and production parity

### 🧹 Cleanup

* Removed deprecated auth logic and duplicate contexts
* Standardized API access patterns across the frontend

---

### Notes

* This release establishes the v1 platform foundation.
* Future widgets (Weather, Admin, Automation tools) will build on this architecture without breaking existing functionality.

---

## [v1.1.0] — Admin panel & user management

**Released:** 2026-01-28

### Added

* Admin dashboard with user list and detail modal
* Role management (`user`, `calendar_user`, `admin`) persisted in DB
* User status management (`active` / `disabled`)
* Backend admin API (`/api/admin/users` GET, PATCH)
* Global enforcement of disabled accounts (login + all API routes)
* Centralized client-side handling for disabled accounts (auto-logout)

### Changed

* Authentication now respects DB-backed roles and status
* Dev/prod API routing aligned via Vite proxy

### Security

* Disabled users are blocked from login and all authenticated APIs
* Self-admin demotion prevented (v1.1 safety)

### Notes

* DB schema extended safely (non-destructive migrations)
* Admin authority is now fully enforced end-to-end

---

## [v1.2.0] — Registration, approvals & dashboard UX

**Released:** 2026-01-30

### Added
- User self-registration with email & password
- Pending user state with restricted access
- Admin approval workflow
- Session persistence across refresh & browser restart
- VillaPro onboarding modal (on-demand connection)
- Secure storage of VillaPro credentials & session cookies
- Widget-level access control
- Dashboard (Hub) tile system

### Improved
- Calendar access flow (approval → VillaPro connect → usage)
- Clear UX states for Calendar widget:
  - 🟢 Connected
  - 🟡 Pending VillaPro connection
  - ⚪ Disabled (not approved)
- Centralized auth/session restoration via `/api/me`
- Robust guard system (`RequireAuth`, `RequireRole`, `RequireApproved`)
- Better error handling & recovery for expired sessions

### Fixed
- Session loss on refresh / reopen
- Calendar falsely showing “pending approval”
- VillaPro connection not reflected in Hub without refresh
- Race conditions during auth initialization
- Multiple edge-case authorization bugs

---

## v1.3.0 — Weather module & UX expansion
**Status:** 🧭 Planned

### Planned
- Move Weather feature from Calendar into its own page
- Dedicated Weather dashboard tile
- Improved weather data visualization
- Cleaner separation of concerns (Calendar vs Weather)
- UX polish & performance improvements

---

