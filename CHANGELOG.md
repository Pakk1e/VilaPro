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



## v1.2.0 — Registration, approvals & widgets (Planned)

### Planned
- User self-registration (pending approval)
- Admin approval workflow
- Widget-level permissions
- Dashboard tiles enhancements
- Admin audit log
