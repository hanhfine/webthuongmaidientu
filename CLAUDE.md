# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tech-store e-commerce site (phones, laptops, accessories), coursework project. Monorepo: `backend/` (Express 5 + Mongoose 9, ESM JavaScript) and `frontend/` (Next.js, **not yet created**; do not assume it exists). Spec: `docs/superpowers/specs/`; plans: `docs/superpowers/plans/`.

## Commands

MongoDB must run as a replica set (transactions are required for orders):

    docker compose up -d --wait

From `backend/`:

    npm run dev        # API on :4000 (node --watch)
    npm run seed       # idempotent ($setOnInsert upserts): admin@shop.local, 3 categories, 12 products, promo WELCOME10
    npm test           # all tests (needs MongoDB up; uses DB webbanhang_test)
    NODE_ENV=test node --env-file-if-exists=.env --test tests/order-create.test.js    # one file
    NODE_ENV=test node --env-file-if-exists=.env --test --test-name-pattern="racing" tests/order-create.test.js  # one test by name

`NODE_ENV=test` is what switches the DB to `webbanhang_test` (see `src/config.js`); never run the seed with it. Config comes from env vars with dev defaults (`backend/.env.example`); there is no dotenv package, scripts use `node --env-file-if-exists`. The seed admin password is `ADMIN_PASSWORD` (default `admin12345`, dev only).

## Architecture

Backend layering is strict: `routes → controllers → services → models`.
- Routes only bind URL + middleware (`authenticate`, `requireRole`/`requireAdmin`) to a controller. Cart, orders, promotion validate and review POST are customer-only (admin gets 403).
- Controllers parse input with zod (`validators/`), call one service function, set status/JSON. No business logic, no model access.
- Services own all business rules and transactions, take plain arguments (never `req`/`res`), and throw `AppError(status, code, message)`. `middleware/errorHandler.js` turns those and `ZodError` into `{code, message, fieldErrors?}`; that is the error contract for every endpoint.
- Authorization is enforced in the backend (JWT in httpOnly `token` cookie; `authenticate` re-checks `isActive` on every request). Frontend route guards are UX only.

Money is an integer number of VND everywhere (no decimals, no floats). Cart stores no prices; order items snapshot name/price at placement. Product search is a case-insensitive regex on name/brand (no text index). Revenue date ranges are Vietnam-local (+07:00) days.

Order integrity (`services/orderService.js`) is the core invariant set: one `withTransaction` covers stock deduction (conditional `$gte` update, lines sorted by product id), promotion consumption (conditional `usedCount < maxUses`), order creation and cart clearing; `(userId, requestKey)` unique index makes replays idempotent; cancel flips status with a conditional update so stock/promo are restored exactly once. Status machine: `pending → confirmed → shipping → delivered`, `cancelled` only while not paid. `paymentStatus` is separate from `status`; only an admin marks `paid` (bank transfer must be paid before confirm), and revenue counts only `delivered` + `paid` orders by `deliveredAt`, excluding shipping fee.

## Testing

Tests hit a real MongoDB (no DB mocks) through supertest; files run serially (`--test-concurrency=1`) and share `webbanhang_test`, wiped by `resetDb()` in `tests/helpers.js`. Transactional behaviour (races, rollback) only works against the replica set.

## Mongoose 9

Use `returnDocument: 'after'` instead of `new: true` in `findOneAndUpdate`. Put imports at the top of files.
