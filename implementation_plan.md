# Campus Cycle — Full-Stack Implementation Plan

## Overview

Build a full-stack web application for a school-internal marketplace and campaign/donation platform. The system enables students and staff to buy/sell used items, participate in fundraising campaigns, and manage donations — all within a trusted school community.

**Tech Stack:**
- **Frontend:** Vite + React 18 + React Router v6, pnpm, Vanilla CSS (Flat Design system)
- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker Compose
- **Icons:** lucide-react
- **Font:** Outfit (Google Fonts)

---

## Database Schema

Based on the ER diagram + requirements + user additions (item_image, campaign_image):

### Tables

| Table | Key Columns |
|---|---|
| `users` | id, name, email, password (hashed), role (admin/member), user_type, status, created_at, updated_at |
| `organizations` | id, name, description, type, created_at, updated_at |
| `organization_admins` | id, user_id (FK), organization_id (FK), created_at |
| `categories` | id, name, description, is_active, created_at, updated_at |
| `items` | id, title, description, price, type, status, category_id (FK), user_id (FK), created_at, updated_at |
| `item_images` | id, item_id (FK), image_path, is_main, created_at |
| `campaigns` | id, title, description, type, status, start_date, end_date, organization_id (FK), created_at, updated_at |
| `campaign_images` | id, campaign_id (FK), image_path, is_main, created_at |
| `campaign_items` | id, item_id (FK), campaign_id (FK), contribution_type, contribution_value, status, created_at |
| `transactions` | id, item_id (FK), buyer_id (FK → users), seller_id (FK → users), campaign_id (FK, nullable), amount, platform_fee, fund_amount, status, created_at, updated_at |

---

## Project Structure

```
campus-cycle/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── uploads/           # local file storage for images
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── organization.py
│       │   ├── category.py
│       │   ├── item.py
│       │   ├── campaign.py
│       │   └── transaction.py
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── organization.py
│       │   ├── category.py
│       │   ├── item.py
│       │   ├── campaign.py
│       │   └── transaction.py
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── users.py
│       │   ├── organizations.py
│       │   ├── categories.py
│       │   ├── items.py
│       │   ├── campaigns.py
│       │   └── transactions.py
│       ├── services/
│       │   └── auth.py
│       └── middleware/
│           └── auth.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css          # Design system tokens & global styles
│       ├── api/
│       │   └── client.js      # Axios instance w/ interceptors
│       ├── hooks/
│       │   └── useAuth.js
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── ui/            # Reusable UI primitives
│       │   │   ├── Button.jsx / Button.css
│       │   │   ├── Input.jsx / Input.css
│       │   │   ├── Modal.jsx / Modal.css
│       │   │   ├── Table.jsx / Table.css
│       │   │   ├── Pagination.jsx / Pagination.css
│       │   │   ├── SearchBar.jsx / SearchBar.css
│       │   │   ├── Toast.jsx / Toast.css
│       │   │   └── ConfirmDialog.jsx
│       │   ├── layout/
│       │   │   ├── AdminLayout.jsx / AdminLayout.css
│       │   │   └── Sidebar.jsx / Sidebar.css
│       │   └── admin/
│       │       ├── PageHeader.jsx / PageHeader.css
│       │       ├── StatsCard.jsx
│       │       ├── ImageGalleryModal.jsx / ImageGalleryModal.css
│       │       └── OrgAdminModal.jsx / OrgAdminModal.css
│       └── pages/
│           ├── auth/
│           │   ├── Login.jsx / Login.css
│           │   └── Register.jsx / Register.css
│           └── admin/
│               ├── Dashboard.jsx / Dashboard.css
│               ├── Users.jsx / Users.css
│               ├── Organizations.jsx / Organizations.css
│               ├── Campaigns.jsx / Campaigns.css
│               ├── Items.jsx / Items.css
│               └── Transactions.jsx / Transactions.css
└── requirement/  # (existing)
```

---

## Proposed Changes

### 1. Infrastructure — Docker Compose

#### [NEW] docker-compose.yml

- **PostgreSQL 16** service with persistent volume, env vars for db credentials
- **Backend** service (FastAPI) — builds from `./backend`, exposes port 8000, depends on postgres, mounts `uploads` volume
- **Frontend** service (dev mode) — builds from `./frontend`, exposes port 5173, depends on backend
- Shared network for inter-service communication

---

### 2. Backend — FastAPI + Alembic

#### [NEW] backend/Dockerfile
- Python 3.11 slim image, install deps, copy app, run uvicorn

#### [NEW] backend/requirements.txt
- fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic, python-jose[cryptography], passlib[bcrypt], python-multipart, python-dotenv

#### [NEW] backend/app/config.py
- Settings via environment variables (DATABASE_URL, SECRET_KEY, UPLOAD_DIR, etc.)

#### [NEW] backend/app/database.py
- SQLAlchemy engine, SessionLocal, Base

#### [NEW] backend/app/models/*.py
- SQLAlchemy ORM models for all 10 tables listed above
- Relationships, enums for status/type/role fields

#### [NEW] backend/alembic/ + alembic.ini
- Alembic config pointing to DATABASE_URL
- Initial migration with all tables

#### [NEW] backend/app/schemas/*.py
- Pydantic schemas for request/response validation for each entity
- Pagination schema (page, page_size, total, items)

#### [NEW] backend/app/services/auth.py
- Password hashing (bcrypt), JWT token creation/verification
- `get_current_user` dependency, `require_admin` dependency

#### [NEW] backend/app/routers/auth.py
- `POST /api/auth/register` — create user with default role "member"
- `POST /api/auth/login` — validate credentials, return JWT
- `GET /api/auth/me` — return current user info

#### [NEW] backend/app/routers/users.py (admin only)
- `GET /api/users` — list with search + pagination
- `GET /api/users/{id}` — detail
- `PUT /api/users/{id}` — update
- `DELETE /api/users/{id}` — soft delete

#### [NEW] backend/app/routers/organizations.py (admin only)
- CRUD endpoints with search + pagination
- `GET /api/organizations/{id}/admins` — list org admins
- `POST /api/organizations/{id}/admins` — add user as org admin
- `DELETE /api/organizations/{id}/admins/{user_id}` — remove org admin
- `GET /api/organizations/{id}/available-users` — users not yet org admin (with search)

#### [NEW] backend/app/routers/categories.py (admin only)
- CRUD with search + pagination

#### [NEW] backend/app/routers/items.py (admin only)
- CRUD with search + pagination
- `GET /api/items/{id}/images` — list images
- `POST /api/items/{id}/images` — upload multiple images
- `PUT /api/items/images/{image_id}/main` — mark as main image
- `DELETE /api/items/images/{image_id}` — delete image

#### [NEW] backend/app/routers/campaigns.py (admin only)
- CRUD with search + pagination
- Same image endpoints pattern as items

#### [NEW] backend/app/routers/transactions.py (admin only)
- List with search + pagination (read-only for now)

#### [NEW] backend/app/routers/dashboard.py (admin only)
- `GET /api/dashboard/stats` — total users, items, campaigns, transactions, revenue
- `GET /api/dashboard/charts` — monthly transaction data, campaign stats, etc.

#### [NEW] backend/app/main.py
- FastAPI app with CORS middleware
- Include all routers
- Static file serving for uploads directory
- Seed admin user on first startup

---

### 3. Frontend — Vite + React + React Router

#### [NEW] frontend/package.json (via `pnpm create vite`)
Dependencies: react, react-dom, react-router-dom, axios, lucide-react, recharts (for charts)

#### [NEW] frontend/src/index.css — Design System
Implement the Flat Design tokens from `flatdesign.md`:
- CSS custom properties for all colors (--bg, --fg, --primary, --secondary, --accent, --muted, --border)
- Typography system using Outfit font
- Utility classes for buttons, cards, inputs
- No box shadows anywhere — color blocks and scale transforms for depth
- Global toast notification styles

#### [NEW] frontend/src/api/client.js
- Axios instance with baseURL `/api`
- Request interceptor to attach JWT from localStorage
- Response interceptor for 401 → redirect to login

#### [NEW] frontend/src/context/AuthContext.jsx
- React Context for auth state (user, token, isAuthenticated, isAdmin)
- Login, logout, register functions
- Persist to localStorage

#### [NEW] frontend/src/App.jsx
- React Router setup:
  - `/login` → Login page
  - `/register` → Register page
  - `/admin/*` → AdminLayout (protected, admin only)
    - `/admin` → Dashboard
    - `/admin/users` → Users management
    - `/admin/organizations` → Organizations management
    - `/admin/campaigns` → Campaigns management
    - `/admin/items` → Items management (with Category section at bottom)
    - `/admin/transactions` → Transactions management

#### [NEW] Auth Pages
- **Login.jsx** — Email + password form, vibrant flat design, decorative geometric shapes
- **Register.jsx** — Name, email, password, confirm password. Default role = member

#### [NEW] Admin Layout Components
- **AdminLayout.jsx** — Fixed left sidebar + main content area
- **Sidebar.jsx** — Logo, nav items (Dashboard, Organizations, Users, Campaigns, Items, Transactions) with active state, logout button. Icons from lucide-react

#### [NEW] Reusable UI Components
- **Button.jsx** — Primary, secondary, outline, danger variants with scale hover effects
- **Input.jsx** — Flat design input with gray-100 bg, blue border on focus
- **Modal.jsx** — Centered overlay popup, click-outside to close option
- **Table.jsx** — Clean flat table with color-block header, hover row highlight
- **Pagination.jsx** — Page numbers + prev/next navigation
- **SearchBar.jsx** — Search input with icon
- **Toast.jsx** — Success/error notification system (auto-dismiss, stacked)
- **ConfirmDialog.jsx** — Delete confirmation popup

#### [NEW] Admin Page Components
- **PageHeader.jsx** — Title on left, "Create" button on right (inside a colored bar)
- **StatsCard.jsx** — Colored flat card with icon, label, and value
- **ImageGalleryModal.jsx** — Grid of images, mark main (star icon), delete (trash icon), upload button (multiple files), notifications inside modal
- **OrgAdminModal.jsx** — List current org admins with remove button, search + select to add new admins, notifications inside modal

#### [NEW] Admin Pages
- **Dashboard.jsx** — Stats row (users, items, campaigns, transactions, revenue) + charts (recharts: BarChart for monthly transactions, PieChart for item status, LineChart for revenue trend)
- **Users.jsx** — PageHeader + SearchBar + Table (Name, Email, Role, Status, Actions: edit/delete) + Pagination. Create/Edit modal forms. Delete confirm dialog.
- **Organizations.jsx** — Same pattern + "Admin" action icon opening OrgAdminModal
- **Campaigns.jsx** — Same pattern + "Gallery" action icon opening ImageGalleryModal. Table shows: Title, Type, Status, Start Date, End Date, Actions
- **Items.jsx** — Same pattern + "Gallery" action. Table shows: Title, Price, Type, Status, Category, Actions. **Category management section** at bottom of page (separate box with its own CRUD table)
- **Transactions.jsx** — Read-only table with search + pagination. Shows: ID, Buyer, Seller, Amount, Platform Fee, Fund Amount, Status

---

## Popup / Notification Behavior

| Action | Popup closes? | Notification? |
|---|---|---|
| Create (any entity) | ✅ Close on success | ✅ Success/error toast |
| Edit (any entity) | ❌ Stay open | ✅ Success/error toast |
| Delete (any entity) | ✅ Close on success | ✅ Success/error toast |
| Gallery: upload/delete image | ❌ Stay open | ✅ Success/error toast |
| Gallery: mark main image | ❌ Stay open | ✅ Success/error toast |
| OrgAdmin: add/remove user | ❌ Stay open | ✅ Success/error toast |

---

## Open Questions

> [!IMPORTANT]
> **Admin seeding:** Should the system auto-create an initial admin user (e.g. `admin@campus-cycle.com` / `admin123`) on first startup? This is needed so you can access the admin panel without manually inserting into the database.

> [!IMPORTANT]
> **Language:** The requirements are in Vietnamese. Should the admin UI use Vietnamese or English labels? I'll default to **English** for the UI unless you prefer Vietnamese.

> [!NOTE]
> **Item/Campaign status values:** Based on the requirements, I'll use these enum values:
> - Item status: `draft`, `pending`, `approved`, `sold`, `rejected`
> - Campaign status: `draft`, `active`, `completed`, `cancelled`
> - Transaction status: `pending`, `completed`, `cancelled`, `refunded`
> - Campaign type: `fundraising`, `donation`
> - Item type: `sell`, `donate`

---

## Verification Plan

### Automated Tests
1. `docker compose up --build` — verify all services start cleanly
2. Run Alembic migrations — verify all tables created
3. Test auth flow: register → login → access admin endpoints
4. Test CRUD operations for each management page
5. Test image upload/delete/mark-main for items and campaigns
6. Test org admin add/remove

### Manual Verification (Browser)
1. Navigate to login/register pages — verify flat design rendering
2. Login as admin — verify sidebar, dashboard stats/charts
3. Test each management page: create, search, edit, delete
4. Test pagination on each page
5. Test image gallery modal (upload, mark main, delete)
6. Test org admin modal (search, add, remove)
7. Verify all toast notifications appear correctly
8. Verify popup close/stay behavior matches the spec table above
