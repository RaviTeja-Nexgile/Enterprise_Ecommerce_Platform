# E-Commerce Platform

An enterprise-grade e-commerce web application that runs entirely on your machine: an Angular
storefront and admin dashboard in `frontend/`, and a Flask REST API over SQLite in `backend/`.
There is no cloud hosting, no external infrastructure and no deployment.

## Requirements

- Node.js 20 or newer (npm 10 or newer)
- Python 3.11 or newer (the backend installs its packages into `backend/.venv`)

## Build and run

Install: npm run install:all
Test: npm test
Run locally: yes
Dev: npm run dev
Port variable: PORT
Health path: /api/health
Devices: both
Deploy: none

`npm run install:all` installs the root, `frontend/` and `backend/` dependencies (the backend's
Python packages into `backend/.venv`). `npm test` runs the backend pytest suite and the frontend
Jest suite once each and exits. `npm run dev` starts Mailpit, applies migrations, seeds an empty
database, then starts the Flask API on `127.0.0.1:5001` and the Angular dev server on
`127.0.0.1:$PORT` with the `/api` proxy.

## What runs where

| Piece | Address |
| --- | --- |
| Angular storefront and admin dashboard | `http://127.0.0.1:$PORT` (default `4200`) |
| Flask API | `http://127.0.0.1:5001` |
| Health check | `http://127.0.0.1:5001/api/health` |
| Mailpit inbox | `http://127.0.0.1:8025` |
| SQLite database | `backend/instance/ecommerce.db` |

The Angular dev server proxies `/api` to the Flask API, so the browser talks to one origin.

## Test logins

- Super Admin — admin@example.com / Admin@12345
- Customer — customer@example.com / Customer@12345
- Admin — manager@example.com / Manager@12345
- Inventory Manager — inventory@example.com / Inventory@12345
- Order Manager — orders@example.com / Orders@12345

The seed script creates these accounts (with Argon2id password hashes) together with sample
categories, products, orders, reviews, coupons and inventory movements. It does nothing when the
database already holds users, and it never creates the test logins when `NODE_ENV` is `production`.

## Configuration

Copy `.env.example` to `.env` and adjust the values. `backend/app/config.py` reads every setting
from the environment; the defaults work for local development.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run install:all` | Install root, frontend and backend dependencies |
| `npm test` | Run the backend pytest suite and the frontend Jest suite |
| `npm test --workspace backend -- tests/test_health.py` | Run one backend test module |
| `npm test --workspace frontend -- app.spec` | Run one frontend test file |
| `npm run dev` | Mailpit, migrations, seed, API and Angular dev server |
| `npm run db:upgrade` | Apply the database migrations |
| `npm run db:seed` | Seed an empty database |

## Project layout

```
backend/            Flask API
  app/              app factory, config, models, migrations, seed
  tests/            pytest suite
frontend/           Angular workspace
  src/app/core/     API client, auth service, interceptors, guards, models
  src/app/shared/   reusable UI components
  e2e/              Playwright journeys
scripts/            dev and install helpers used by the npm scripts
```
