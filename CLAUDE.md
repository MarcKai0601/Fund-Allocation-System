# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**代操投資資金與台股績效管理系統 (Fund Allocation & Taiwan Stock Performance Management System)**

A multi-portfolio fund management platform for Taiwan stock market. Each authenticated user can own multiple portfolios; each portfolio tracks fund deposits, buy/sell trades, positions (weighted-average cost), and realized/unrealized P&L.

Current version: `v5.0.0` (managed in `backend/app/core/version.py`).

---

## Development Commands

### Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, FUGLE_API_KEY

# Dev server (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI: http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

### Frontend (Next.js)

```bash
cd frontend
npm install

# Dev server (HMR)
npm run dev

npm run build   # production build
npm run start   # start production server
npm run lint    # ESLint check
```

Frontend: http://localhost:3000

Set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and `NEXT_PUBLIC_SSO_LOGIN_URL` (default `http://localhost:5173/login`) in `frontend/.env.local` if needed.

### Database Init

```bash
mysql -u root -p < init.sql
```

Creates database `fund_allocation` with tables: `portfolio`, `fund_ledger`, `stock_master`, `transactions`, `positions`, `fifo_lots`.

---

## Architecture

### Backend (`backend/`)

**Stack:** Python 3.11 · FastAPI · SQLAlchemy 2 (ORM) · Pydantic v2 · MySQL 8 · Redis 7 · yfinance/Fugle for quotes · twstock for stock list sync

```
backend/
├── main.py               # App factory: CORS, middleware, router registration, lifespan
└── app/
    ├── core/
    │   ├── config.py     # Pydantic Settings (reads .env)
    │   ├── database.py   # SQLAlchemy engine + get_db() dependency
    │   ├── redis_client.py
    │   ├── security.py   # Auth dependencies (see Auth section)
    │   ├── middleware.py  # RequestLoggingMiddleware (adds X-Request-ID header)
    │   └── version.py    # VERSION, VERSION_PREFIX, RELEASE_DATE — update here on releases
    ├── models/           # SQLAlchemy ORM models (one file per table)
    ├── schemas/
    │   └── schemas.py    # All Pydantic v2 Request/Response models
    ├── services/
    │   ├── fund_service.py   # Fund init, deposit, ledger queries
    │   ├── trade_service.py  # BUY/SELL logic (FIFO + weighted avg cost)
    │   └── quote_service.py  # Real-time price fetch + Redis cache + P&L computation
    ├── api/
    │   ├── auth.py       # GET /api/auth/me
    │   ├── portfolios.py # All portfolio-scoped routes (funds, trades, overview)
    │   └── stocks.py     # Stock search autocomplete + quote endpoint
    └── tasks/
        └── stock_sync.py # Background task: sync stock_master from twstock on startup
```

**Key env vars (`backend/.env`):**

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost:3306/fund_allocation` | |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `FUGLE_API_KEY` | `""` | For portfolio overview quotes |
| `FUGLE_API_KEY_QUOTE` | `""` | For trade-entry stock search quotes; falls back to `FUGLE_API_KEY` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list for CORS |
| `QUOTE_CACHE_TTL` | `120` | Seconds; Redis TTL for stock price cache |
| `SLIDING_WINDOW_TTL` | `1800` | Seconds; Redis token TTL extension per API call |

### Frontend (`frontend/src/`)

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Shadcn UI · Axios · Zustand · react-i18next · Sonner

```
frontend/src/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout: ThemeProvider > I18nProvider > TokenCatcher + AppContent
│   ├── page.tsx          # Dashboard (portfolio overview, positions, auto-refresh every 60s)
│   ├── funds/page.tsx    # Fund management (init/deposit, ledger)
│   └── trades/page.tsx   # Trade history + new trade form with stock autocomplete
├── components/
│   ├── TokenCatcher.tsx  # SSO token ingestion + /api/auth/me validation (runs in Suspense)
│   ├── AppContent.tsx    # Route guard: blocks render until auth initialized; redirects if no token
│   ├── Sidebar.tsx       # Navigation + portfolio switcher
│   ├── I18nProvider.tsx  # i18next initialization wrapper
│   └── ui/               # Shadcn UI components
├── lib/
│   ├── api.ts            # All Axios API calls + TypeScript types + fmt helpers
│   ├── auth-store.ts     # Zustand: token, user profile (persisted to localStorage)
│   ├── portfolio-store.ts # Zustand: portfolio list + activePortfolioId (persisted)
│   └── utils.ts          # cn() Tailwind merge helper
├── i18n/config.ts        # i18next setup
└── locales/              # Translation files: zh-TW.json, en.json, ja.json, ko.json
```

---

## Authentication & Authorization

This system does **not** implement its own login. It relies on an **external SSO system** (a separate Java service). The flow:

1. SSO system writes a session JSON blob to Redis under key `token:<token>`.
2. On login, SSO redirects the user to FAS with `?token=<token>` in the URL.
3. **`TokenCatcher`** component captures the URL token, stores it in Zustand, calls `/api/auth/me` to validate, then strips the token from the URL.
4. **`AppContent`** acts as a Route Guard: if auth initialization completes with no token, it redirects to `NEXT_PUBLIC_SSO_LOGIN_URL`.
5. The Axios instance in `api.ts` auto-attaches `Authorization: Bearer <token>` to every request. A 401 response triggers logout + redirect to SSO.

**Backend security (`app/core/security.py`) — FastAPI dependencies:**

- `get_current_user` — validates token against Redis, applies **sliding window** TTL extension.
- `get_current_user_session` — extracts FAS-scoped roles from the session blob (handles both `{"systemCode": "FAS", "roleCode": "..."}` structs and plain string arrays).
- `require_fas_access` — requires at least one FAS role; returns `user_id` as int.
- `RequireRole("ADMIN")` — RBAC check for specific role codes (used as `Depends(RequireRole("ADMIN"))`).
- `get_valid_portfolio` — fetches portfolio by `pid`, verifies `owner_user_id == user_id` (BOLA/IDOR protection).

**All portfolio-scoped endpoints** use `Depends(get_valid_portfolio)` to enforce ownership.

---

## Business Logic

### Trade Execution

- **BUY**: checks `available_funds`, updates `positions` via weighted-average cost, inserts a `fifo_lots` record, deducts `account.available_funds`.
- **SELL**: consumes oldest `fifo_lots` entries (FIFO), calculates `cost_basis`, `pnl`, `pnl_pct`, adds proceeds to `available_funds`.
- `available_funds = total_deposited − total_invested` (no manual formula — derived from `account` table state).

### Real-time Quotes

1. Check Redis cache (`quote:<symbol>`, TTL = `QUOTE_CACHE_TTL` seconds).
2. On miss: try Fugle API (`FUGLE_API_KEY`); fall back to yfinance (appends `.TW` or `.TWO`).
3. Write result back to Redis.

### Stock Master Sync

On startup, `lifespan` checks if sync is needed (`should_sync()`), then runs `sync_stock_master()` in a background thread (`asyncio.to_thread`) to avoid blocking the event loop. Sync interval controlled by `STOCK_SYNC_INTERVAL_HOURS`.

---

## Deployment

The production backend runs on **Zeabur** (containerized via `backend/Dockerfile`). `backend/start.sh` handles the production startup sequence:

1. Start `tailscaled` (Tailscale userspace networking, SOCKS5 on port 1055).
2. Authenticate with `TAILSCALE_AUTHKEY`.
3. Use `socat` to tunnel MySQL (3306) and Redis (6379) over Tailscale to a Raspberry Pi.
4. Launch `uvicorn` on `$PORT` (default 8080).

The frontend is separately deployed via `frontend/Dockerfile`.

**`zbpack.json`** at the repo root is the Zeabur build config (just specifies files to ignore).

---

## Multi-language (i18n)

Frontend supports **zh-TW, en, ja, ko**. Translation files live in `frontend/src/locales/`. The user's preferred language is stored in the Redis session (`language` field) and applied on login via `i18n.changeLanguage(res.data.language)` inside `TokenCatcher`.

---

## Version Management

Bump `VERSION`, `VERSION_PREFIX`, `RELEASE_DATE`, and `DESCRIPTION` in `backend/app/core/version.py` for each release. The version is exposed at `GET /` and `GET /api/system/version`.
