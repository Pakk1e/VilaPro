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

## [v1.1.0] – Admin Panel & User Management

**Release date:** TBD

### ✨ Added

* Admin dashboard with user list and role management
* Role assignment flows (user, calendar_user, admin)
* Ability for admins to approve or revoke Calendar access
* UI controls to manage user status without redeploys

### 🔐 Security

* Admin-only route protection and server-side role enforcement
* Safe role updates persisted in the database

### 🧱 Architecture

* Admin widget implemented as a standalone page
* Shared auth/role guards reused across widgets

---

### Notes

* This release establishes the v1 platform foundation.
* Future widgets (Weather, Admin, Automation tools) will build on this architecture without breaking existing functionality.
