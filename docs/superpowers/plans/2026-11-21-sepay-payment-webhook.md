# SePay Webhook Payment & State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement production-grade automatic bank transfer payments via SePay Webhook with a centralized State Machine, 15-minute stock reservation TTL, async reconciliation cronjob, real-time SSE + smart polling UI, and full edge-case handling.

**Architecture:** All financial/order status transitions run inside MongoDB transactions through a single centralized state machine (`backend/src/services/paymentStateMachine.js`). Bank orders atomically reserve stock (`stock -= qty, reservedStock += qty`) for 15 minutes; SePay webhook (`POST /api/webhooks/sepay`) verifies `Apikey` via `crypto.timingSafeEqual`, enforces `providerTxnId` uniqueness, settles or flags exceptions (underpayment, overpayment, unmatched, late payment), enqueues SSE/notification side effects, and returns `200 OK` immediately. Background workers release expired reservations and reconcile missed webhooks every 5 minutes.

**Tech Stack:** Node.js 22+ (ESM), Express 5, Mongoose 9 (MongoDB Replica Set), Zod, `node:crypto`, Next.js 15 (React 19 + Tailwind CSS), `node:test` + `supertest`.

**Spec:** `docs/superpowers/specs/2026-11-21-sepay-payment-webhook-design.md`

## Global Constraints

- All money values MUST be non-negative integers in VND (`Number.isSafeInteger(v) && v >= 0`); zero floats or doubles anywhere.
- All `Payment.status` and `Order.paymentStatus` mutations MUST go through `backend/src/services/paymentStateMachine.js`; zero scattered status `UPDATE` calls across controllers/services.
- **ZERO webhook simulation buttons** or mock-webhook endpoints/controls anywhere in `frontend/` or `backend/` (all testing runs via automated `node:test` + `supertest` suites or external HTTP clients with valid API key).
- All 90 existing backend tests (`cd backend && npm test`) MUST continue to pass unmodified.
- Background timers (TTL expiration & SePay reconciliation cron) MUST NOT auto-start when `NODE_ENV === 'test'`; export `runExpireReservationsOnce()` and `runReconcileOnce()` for deterministic testing.
- Mongoose 9 rule: always use `returnDocument: 'after'` instead of `new: true` in `findOneAndUpdate`.

## Review Focus

- `PATCH /api/admin/orders/:id/payment` (`confirmPayment`) MUST pass `autoConfirmOrder: false` so `Order.status` remains `'pending'` (required by `tests/order-lifecycle.test.js:84-85`), whereas SePay webhook full payment MUST pass `autoConfirmOrder: true` (`pending` -> `confirmed`).
- Late payment on a `CANCELLED` order with 2 items where item 1 is in stock and item 2 is out of stock: recovery transaction MUST abort cleanly so item 1's stock is untouched, then record `NEED_REFUND` in a separate transaction.
- Concurrent/sequential duplicate webhooks sharing the same `providerTxnId` (number or string): unique index on `PaymentTransaction.providerTxnId` handles `11000` cleanly and returns `200 { ok: true, duplicated: true }` without double-crediting `paidAmount`.
- `PARTIALLY_PAID` order expiring past grace window: MUST transition to `NEED_REFUND` (releasing `reservedStock` back to `stock` and releasing promo), NEVER `CANCELLED`.
- `Authorization: Apikey <key>` validation with unequal string lengths MUST NOT throw `RangeError` in `crypto.timingSafeEqual`; hash both values with SHA-256 first and return clean `401`.

---

### Task 1: Config, Database Models (`Product`, `Order`, `Payment`, `PaymentTransaction`, `UnmatchedTransaction`) & Async Event Bus

**Files:**
- Modify: `backend/src/config.js`
- Modify: `backend/.env.example`
- Modify: `render.yaml`
- Modify: `backend/src/models/Product.js`
- Modify: `backend/src/models/Order.js`
- Create: `backend/src/models/Payment.js`
- Create: `backend/src/models/PaymentTransaction.js`
- Create: `backend/src/models/UnmatchedTransaction.js`
- Create: `backend/src/lib/paymentEvents.js`

**Interfaces:**
- Produces:
  - `config.bank`: `{ name: string, code: string, account: string, holder: string }`
  - `config.sepay`: `{ webhookApiKey: string, userApiToken: string, allowedIps: string[], apiBaseUrl: string }`
  - `config.payment`: `{ reservationMinutes: number, partialGraceMinutes: number, reconcileIntervalMs: number, expireIntervalMs: number }`
  - `Product` field `reservedStock` (`Number`, default `0`, `min: 0`)
  - `Order` fields `orderCode` (unique sparse), `paymentStatus` enum `['unpaid', 'pending', 'partially_paid', 'paid', 'need_refund', 'refunded']`, `paymentExpiresAt`, `paidAmount`, `overpaidAmount`
  - Mongoose models `Payment`, `PaymentTransaction` (unique `providerTxnId`), `UnmatchedTransaction` (unique `providerTxnId`)
  - `paymentEvents.js`: `emitOrderPaymentUpdate(orderId, payload)`, `subscribeOrderPaymentUpdates(orderId, listener) -> unsubscribeFn`, `enqueueAsyncTask(label, fn)`

- [ ] **Step 1: Extend `backend/src/config.js`, `backend/.env.example`, and `render.yaml`**
  - In `backend/src/config.js`, add optional `BANK_CODE` (default derived from `BANK_NAME`, e.g., `'Vietcombank' -> 'VCB'`, `'MBBank'/'MB' -> 'MB'`, fallback `'VCB'`), `sepay` (`webhookApiKey`, `userApiToken`, `allowedIps` split by comma, `apiBaseUrl` default `'https://my.sepay.vn/userapi'`), and `payment` (`reservationMinutes` default `15`, `partialGraceMinutes` default `30`, `reconcileIntervalMs` default `300000`, `expireIntervalMs` default `60000`). Do NOT throw when `SEPAY_WEBHOOK_API_KEY` is empty so `tests/config.test.js` continues to pass.
  - Document new env vars in `backend/.env.example` and add `SEPAY_WEBHOOK_API_KEY`, `SEPAY_USER_API_TOKEN`, `BANK_NAME`, `BANK_CODE`, `BANK_ACCOUNT`, `BANK_HOLDER`, `PAYMENT_RESERVATION_MINUTES` (`sync: false` for secrets) in `render.yaml` under `webthuongmaidientu-api`.

- [ ] **Step 2: Update `Product.js` & `Order.js`, create `Payment.js`, `PaymentTransaction.js`, `UnmatchedTransaction.js`**
  - `Product.js`: add `reservedStock: { type: Number, required: true, default: 0, min: 0 }`.
  - `Order.js`: add `orderCode: { type: String, unique: true, sparse: true }`, extend `paymentStatus` enum to `['unpaid', 'pending', 'partially_paid', 'paid', 'need_refund', 'refunded']`, add `paymentExpiresAt: { type: Date, default: null }`, `paidAmount: { type: Number, default: 0, min: 0 }`, `overpaidAmount: { type: Number, default: 0, min: 0 }`.
  - `Payment.js`: `orderId` (unique), `orderCode` (unique), `userId`, `provider` (`'sepay'`), `expectedAmount` (int >= 0), `paidAmount` (int >= 0, default 0), `overpaidAmount` (int >= 0, default 0), `status` (`'PENDING_PAYMENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'NEED_REFUND' | 'REFUNDED'`), `expiresAt` (`Date`), `partialGraceExpiresAt` (`Date | null`), `paidAt`, `refundedAt`, `refundNote`, `recoveredFromCancelled` (`Boolean`, default `false`), `stateHistory` (`[{ from, to, reason, actor, providerTxnId, amount, timestamp }]`, `_id: false`). Add index `{ status: 1, expiresAt: 1 }` and `{ status: 1, partialGraceExpiresAt: 1 }`.
  - `PaymentTransaction.js`: `providerTxnId` (String, required, unique), `provider` (`'sepay'`), `source` (`'webhook' | 'reconcile_cron'`), `gateway`, `accountNumber`, `transferType` (`'in' | 'out'`), `transferAmount` (Number, min 0), `content`, `extractedOrderCode`, `referenceCode`, `transactionDate`, `orderId`, `paymentId`, `matchStatus` (`'MATCHED_PAID' | 'MATCHED_PARTIAL' | 'MATCHED_OVERPAID' | 'LATE_RECOVERED' | 'LATE_NEED_REFUND' | 'UNMATCHED' | 'IGNORED_OUTGOING' | 'ALREADY_SETTLED'`), `rawPayload` (`Mixed`), `processedAt`.
  - `UnmatchedTransaction.js`: `providerTxnId` (unique), `paymentTransactionId` (ref `PaymentTransaction`), `amount` (int >= 0), `content`, `gateway`, `accountNumber`, `transactionDate`, `resolutionStatus` (`'OPEN' | 'RESOLVED_MATCHED' | 'RESOLVED_REFUNDED' | 'IGNORED'`, default `'OPEN'`), `resolvedOrderId`, `resolvedBy`, `resolvedNote`, `resolvedAt`. Add index `{ resolutionStatus: 1, createdAt: -1 }`.

- [ ] **Step 3: Create `backend/src/lib/paymentEvents.js`**
  - Use Node's `EventEmitter` (`setMaxListeners(0)`):
    - `emitOrderPaymentUpdate(orderId, payload)` emits on channel `order:${String(orderId)}`.
    - `subscribeOrderPaymentUpdates(orderId, listener)` registers listener and returns a clean unsubscribe closure.
    - `enqueueAsyncTask(label, fn)` runs `Promise.resolve().then(fn).catch(...)` inside `setImmediate` so webhook HTTP responses flush immediately without blocking on side effects.

- [ ] **Step 4: Run `cd backend && npm test`**
  - Expected: All 90 existing tests PASS.

---

### Task 2: Centralized Payment & Order State Machine (`paymentStateMachine.js`)

**Files:**
- Create: `backend/src/services/paymentStateMachine.js`
- Create: `backend/tests/payment-state-machine.test.js`

**Interfaces:**
- Consumes: `Payment`, `Order`, `Product`, `promotionService`, `AppError`
- Produces:
  - `ALLOWED_PAYMENT_TRANSITIONS`
  - `PAYMENT_TO_ORDER_STATUS`
  - `transitionPaymentState({ paymentId, targetState, reason, actor, providerTxnId, amount, paidAmountDelta, autoConfirmOrder, refundNote, partialGraceMinutes, session })` -> `{ payment, order }`
  - `handleLatePaymentException({ paymentId, transferAmount, providerTxnId, actor })` -> `{ outcome: 'LATE_RECOVERED' | 'LATE_NEED_REFUND', payment, order }`
  - `transitionOrderStatus(orderId, nextStatus, { actor, session } = {})` -> `order`

- [ ] **Step 1: Write failing unit/integration tests in `backend/tests/payment-state-machine.test.js`**
  - Assert `PENDING_PAYMENT -> PAID`, `PENDING_PAYMENT -> PARTIALLY_PAID -> PAID`, `PENDING_PAYMENT -> CANCELLED`, `PAID -> REFUNDED`, `NEED_REFUND -> REFUNDED` all succeed and append `stateHistory`.
  - Assert forbidden transitions (`CANCELLED -> PAID` via `transitionPaymentState`, `PENDING_PAYMENT -> REFUNDED`, `REFUNDED -> PAID`) throw `AppError` with HTTP `409` and code `INVALID_STATE_TRANSITION`.
  - Assert `handleLatePaymentException`:
    - When stock is sufficient for all items: recovers `CANCELLED -> PAID` (`recoveredFromCancelled: true`, `Order.status === 'confirmed'`, `stateHistory` includes `LATE_PAYMENT_RECOVERY`, stock decremented).
    - When 2 items exist (item 1 has stock, item 2 has `stock: 0`): aborts stock deduction cleanly (item 1 stock unchanged!) and transitions `CANCELLED -> NEED_REFUND` (`Order.paymentStatus === 'need_refund'`).

- [ ] **Step 2: Run test to verify it fails**
  - Run: `cd backend && NODE_ENV=test node --env-file-if-exists=.env --test tests/payment-state-machine.test.js`
  - Expected: FAIL (`Cannot find module '../src/services/paymentStateMachine.js'`).

- [ ] **Step 3: Implement `backend/src/services/paymentStateMachine.js`**
  - Implement strict `ALLOWED_PAYMENT_TRANSITIONS` map and `PAYMENT_TO_ORDER_STATUS` map.
  - Inside `transitionPaymentState` (supports optional caller-supplied `session`, or opens its own `session.withTransaction` if omitted):
    - Load `Payment` and `Order` in `session`. Validate `ALLOWED_PAYMENT_TRANSITIONS[payment.status]?.includes(targetState)`; otherwise throw `new AppError(409, 'INVALID_STATE_TRANSITION', ...)`.
    - Compute integer `paidAmountDelta = Number(paidAmountDelta || 0)` (reject non-safe-integers). Update `nextPaidTotal = payment.paidAmount + paidAmountDelta`.
    - When `targetState === 'PAID'`: `paidAmount = Math.min(payment.expectedAmount, nextPaidTotal)` (or if manual confirm with 0 delta when already >= expected, keep; if `paidAmountDelta === 0 && payment.paidAmount < payment.expectedAmount && actor.startsWith('admin')`, set `paidAmount = payment.expectedAmount` for admin manual confirmation). Compute `overpaidAmount = payment.overpaidAmount + Math.max(0, nextPaidTotal - payment.expectedAmount)`. Release reservation: for each order item, atomically `$inc: { reservedStock: -item.quantity }` on `Product` (guard `reservedStock: { $gte: item.quantity }`). Set `paidAt = new Date()`.
    - When `targetState === 'PARTIALLY_PAID'`: `paidAmount = nextPaidTotal`. Set `partialGraceExpiresAt` if provided and not yet set.
    - When `targetState === 'CANCELLED'` (from `PENDING_PAYMENT`) or `targetState === 'NEED_REFUND'` (from `PARTIALLY_PAID`): release reservation `$inc: { stock: +item.quantity, reservedStock: -item.quantity }` on each item, release `order.promotionCode` via `promotionService.release`, set `Order.status = 'cancelled'`. If `targetState === 'NEED_REFUND'`, accumulate `paidAmount` with `paidAmountDelta` if provided.
    - When `targetState === 'REFUNDED'`: set `refundedAt = new Date()`, `refundNote = refundNote || ''`.
    - Atomically update `Payment` using `{ _id: payment._id, status: payment.status }` condition (`returnDocument: 'after'`), throwing `409 CONFLICT` if modified concurrently.
    - Update `Order` in the same `session` syncing `paymentStatus`, `paidAmount`, `overpaidAmount`, and if `autoConfirmOrder && targetState === 'PAID' && order.status === 'pending'` set `status: 'confirmed'`.
  - Implement `handleLatePaymentException({ paymentId, transferAmount, providerTxnId, actor })`:
    - Check `payment.status === 'CANCELLED'`.
    - Attempt recovery in a transaction: check `payment.paidAmount + transferAmount >= payment.expectedAmount`; sort `order.items` by `productId` and atomically decrement `stock` (`stock >= qty`, `$inc: { stock: -qty }`); re-consume `order.promotionCode` if present. If everything succeeds, update `Payment` (`status: 'PAID'`, `recoveredFromCancelled: true`, `paidAmount: payment.expectedAmount`, `overpaidAmount`, `paidAt`, `stateHistory` reason `'LATE_PAYMENT_RECOVERY'`) and `Order` (`paymentStatus: 'paid'`, `status: 'confirmed'`, `paidAmount`, `overpaidAmount`), return `{ outcome: 'LATE_RECOVERED', payment, order }`.
    - If stock or promo or underpayment fails, catch inside recovery transaction (which rolls back any partial item stock deduction automatically!) and run `transitionPaymentState` (`CANCELLED -> NEED_REFUND`, `paidAmountDelta: transferAmount`, `reason: 'LATE_PAYMENT_OUT_OF_STOCK'` or `'LATE_PAYMENT_UNDERPAID'`), returning `{ outcome: 'LATE_NEED_REFUND', payment, order }`.
  - Implement `transitionOrderStatus(orderId, nextStatus, { actor, session } = {})` validating `pending -> [confirmed, cancelled]`, `confirmed -> [shipping, cancelled]`, `shipping -> [delivered]`, enforcing bank `confirmed` requires `paymentStatus === 'paid'`, and setting `deliveredAt` on `delivered`.

- [ ] **Step 4: Run `payment-state-machine.test.js` and verify PASS**
  - Run: `cd backend && NODE_ENV=test node --env-file-if-exists=.env --test tests/payment-state-machine.test.js`
  - Expected: PASS.

---

### Task 3: Order Service Reservation, `Idempotency-Key` Header & Real-Time SSE Endpoint

**Files:**
- Modify: `backend/src/validators/order.js`
- Modify: `backend/src/controllers/orderController.js`
- Modify: `backend/src/services/orderService.js`
- Modify: `backend/src/routes/order.routes.js`

**Interfaces:**
- Consumes: `Payment`, `paymentStateMachine.js`, `paymentEvents.js`, `config.js`
- Produces:
  - `toResult(order, payment = null)` returning `orderCode`, `paymentExpiresAt`, `payment`, and `paymentInfo` (including `qrUrl`, `transferContent`, `expectedAmount`, `paidAmount`, `overpaidAmount`, `remainingAmount`, `expiresAt`, `status`)
  - `GET /api/orders/:id/events` SSE endpoint (`authenticate`)

- [ ] **Step 1: Update `validators/order.js` & `controllers/orderController.js`**
  - In `orderController.create`: allow `requestKey` from either `req.body?.requestKey` or `req.get('idempotency-key')` before calling `createOrderSchema.parse(...)`.
  - Update `orderController.show`, `orderController.showAdmin`, `orderController.create` to load associated `Payment` (or return from service) and pass to `service.toResult(order, payment)`.
  - Add `orderController.streamEvents(req, res)` for `GET /api/orders/:id/events`: verify user owns order (`req.user.role === 'admin' || String(order.userId) === req.user.id`), set SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`), send initial `event: payment_update\ndata: ...\n\n`, subscribe to `subscribeOrderPaymentUpdates(order._id, ...)`, start 25s heartbeat `: ping\n\n` (`.unref()`), and unsubscribe + clear interval on `req.on('close')`.

- [ ] **Step 2: Update `services/orderService.js` & `routes/order.routes.js`**
  - In `orderService.create`:
    - Generate `_id = new mongoose.Types.ObjectId()` and `orderCode = 'DH' + String(_id).slice(-8).toUpperCase()`.
    - For `paymentMethod === 'bank'`: atomically update `Product` with `$inc: { stock: -item.quantity, reservedStock: item.quantity }`, set `paymentExpiresAt = new Date(Date.now() + config.payment.reservationMinutes * 60_000)`, create `Payment` doc inside the same transaction with `status: 'PENDING_PAYMENT'`, `expectedAmount: total`, `expiresAt: paymentExpiresAt`, initial `stateHistory` (`from: null, to: 'PENDING_PAYMENT', reason: 'ORDER_CREATED'`).
    - For `paymentMethod === 'cod'`: keep existing behavior (`stock: -item.quantity`, `reservedStock` unchanged, no `Payment` record needed).
  - In `orderService.toResult(order, payment)`:
    - Preserve `paymentInfo.bank` and `paymentInfo.transferContent = obj.orderCode || 'DH' + String(obj._id).slice(-8).toUpperCase()`.
    - Compute `expectedAmount = payment?.expectedAmount ?? obj.total`, `paidAmount = payment?.paidAmount ?? obj.paidAmount ?? 0`, `overpaidAmount = payment?.overpaidAmount ?? obj.overpaidAmount ?? 0`, `remainingAmount = Math.max(0, expectedAmount - paidAmount)`.
    - Add `paymentInfo.qrUrl = 'https://qr.sepay.vn/img?' + new URLSearchParams({ acc: config.bank.account, bank: config.bank.code, amount: String(remainingAmount || expectedAmount), des: transferContent }).toString()`, `paymentInfo.expiresAt = payment?.expiresAt ?? obj.paymentExpiresAt ?? null`, `paymentInfo.expectedAmount`, `paymentInfo.paidAmount`, `paymentInfo.overpaidAmount`, `paymentInfo.remainingAmount`, `paymentInfo.status = payment?.status ?? null`.
    - Also attach lightweight `payment` summary on the serialized order when `payment` is present.
  - Route `orderService.cancel` through `transitionPaymentState` when a `Payment` exists (`PENDING_PAYMENT -> CANCELLED`, `PARTIALLY_PAID -> NEED_REFUND`); keep existing COD cancel transaction when no `Payment` exists. Emit SSE update on completion.
  - Route `orderService.confirmPayment` through `transitionPaymentState(..., 'PAID', { autoConfirmOrder: false, reason: 'ADMIN_MANUAL_CONFIRM', actor: 'admin' })` when a `Payment` exists; keep existing conditional update for COD orders. Emit SSE update on completion.
  - Route `orderService.updateStatus` through `transitionOrderStatus` (or `cancel` when `next === 'cancelled'`).
  - Add `router.get('/orders/:id/events', authenticate, c.streamEvents)` in `backend/src/routes/order.routes.js`.

- [ ] **Step 3: Run `cd backend && npm test`**
  - Expected: All 90+ tests PASS with zero regressions.

---

### Task 4: SePay Webhook Handler, Reconciliation Cronjob, TTL Worker & Admin Payment APIs

**Files:**
- Create: `backend/src/validators/payment.js`
- Create: `backend/src/services/sepayService.js`
- Create: `backend/src/controllers/paymentController.js`
- Create: `backend/src/routes/payment.routes.js`
- Modify: `backend/src/routes/index.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- Consumes: `Order`, `Payment`, `PaymentTransaction`, `UnmatchedTransaction`, `paymentStateMachine.js`, `paymentEvents.js`, `config.js`
- Produces:
  - `POST /api/webhooks/sepay` & `POST /api/webhooks/payment`
  - `GET /api/admin/payments/unmatched`, `POST /api/admin/payments/unmatched/:id/reconcile`
  - `GET /api/admin/payments/exceptions`, `POST /api/admin/orders/:id/refund`
  - `runExpireReservationsOnce(now = new Date())`, `runReconcileOnce({ fetchImpl } = {})`

- [ ] **Step 1: Create `backend/src/validators/payment.js`**
  - `sepayWebhookSchema`: accepts `id` (`z.union([z.number().int(), z.string().trim().min(1)])`), `gateway` (optional string), `transactionDate` (optional string), `accountNumber` (optional string), `subAccount` (optional nullable string), `code` (optional nullable string), `content` (optional string), `transferType` (`z.enum(['in', 'out'])`), `description` (optional nullable string), `transferAmount` (`z.number().int().min(0)`), `referenceCode` (optional nullable string), `accumulated` (optional number). Strict `.int().min(0)` rejects floats and negative amounts with `400`.
  - `reconcileUnmatchedSchema`: `{ action: z.enum(['match_order', 'mark_refunded', 'ignore']), orderId: objectId.optional(), note: z.string().trim().max(500).optional() }`.
  - `refundOrderSchema`: `{ note: z.string().trim().max(500).optional() }`.

- [ ] **Step 2: Create `backend/src/services/sepayService.js`**
  - `verifyWebhookAuth(req)`:
    - Check `config.sepay.webhookApiKey` non-empty and extract token from `req.headers.authorization` matching `/^(?:Apikey|Bearer)\s+(.+)$/i`. Hash both expected and provided strings with SHA-256 (`32 bytes`) and compare via `crypto.timingSafeEqual` (so unequal lengths never throw `RangeError` and still run constant-time check). Throw `AppError(401, 'UNAUTHORIZED_WEBHOOK', 'API Key webhook không hợp lệ')` on mismatch.
    - If `config.sepay.allowedIps.length > 0`: normalize `req.ip` (strip `::ffff:`), reject with `AppError(403, 'FORBIDDEN_IP', 'IP không nằm trong danh sách cho phép')` if not listed.
  - `extractOrderCode(payload)`: search `payload.code` then `payload.content` with `/\bDH[0-9A-F]{8}\b/i` and return uppercase code or `null`.
  - `processIncomingTransaction(payload, { source = 'webhook' } = {})`:
    - Compute `providerTxnId = String(payload.id)`.
    - Fast duplicate check: if `PaymentTransaction.exists({ providerTxnId })` -> return `{ ok: true, duplicated: true }`.
    - Run inside `session.withTransaction`:
      - Re-check/insert `PaymentTransaction` (`11000` caught cleanly outside -> `{ ok: true, duplicated: true }`).
      - If `payload.transferType !== 'in'`: save `PaymentTransaction` (`matchStatus: 'IGNORED_OUTGOING'`), return `{ ok: true, matchStatus: 'IGNORED_OUTGOING' }`.
      - Extract `orderCode`. Find `Payment` by `{ orderCode }`.
      - If no `Payment` found: save `PaymentTransaction` (`matchStatus: 'UNMATCHED'`, `extractedOrderCode: orderCode`) and create `UnmatchedTransaction` (`resolutionStatus: 'OPEN'`). Enqueue async admin alert log. Return `{ ok: true, matchStatus: 'UNMATCHED', orderCode }`.
      - Branch by `payment.status`:
        - `'PENDING_PAYMENT'` or `'PARTIALLY_PAID'`: compute `newTotal = payment.paidAmount + payload.transferAmount`. Call `transitionPaymentState` inside same `session`:
          - `< expectedAmount` -> `'PARTIALLY_PAID'`, `matchStatus = 'MATCHED_PARTIAL'`, reason `'WEBHOOK_PARTIAL_PAYMENT'`
          - `=== expectedAmount` -> `'PAID'`, `autoConfirmOrder: true`, `matchStatus = 'MATCHED_PAID'`, reason `'WEBHOOK_FULL_PAYMENT'`
          - `> expectedAmount` -> `'PAID'`, `autoConfirmOrder: true`, `matchStatus = 'MATCHED_OVERPAID'`, reason `'WEBHOOK_OVERPAYMENT'`
        - `'CANCELLED'`: handle via `handleLatePaymentException` (note: perform `PaymentTransaction` insertion cleanly with idempotency lock so rollback inside recovery never drops the transaction audit trail!).
        - `'PAID'`, `'NEED_REFUND'`, `'REFUNDED'`: increment `overpaidAmount` if incoming `'in'` transfer arrived on an already `PAID` order (record audit history / exception note), mark `PaymentTransaction` as `'ALREADY_SETTLED'`.
    - After commit, call `enqueueAsyncTask` to emit `emitOrderPaymentUpdate(orderId, ...)` so connected clients update in real time without delaying the webhook `200 OK` response.
  - `runExpireReservationsOnce(now = new Date())`:
    - Find `Payment` with `status: 'PENDING_PAYMENT', expiresAt: { $lte: now }` -> transition each to `'CANCELLED'` (`reason: 'RESERVATION_EXPIRED'`, `actor: 'system:ttl_worker'`), emitting SSE updates.
    - Find `Payment` with `status: 'PARTIALLY_PAID', partialGraceExpiresAt: { $lte: now }` -> transition each to `'NEED_REFUND'` (`reason: 'PARTIAL_PAYMENT_EXPIRED'`, `actor: 'system:ttl_worker'`), emitting SSE updates.
    - Return `{ cancelledCount, needRefundCount }`.
  - `runReconcileOnce({ fetchImpl = globalThis.fetch } = {})`:
    - Return `{ skipped: true, reason: 'MISSING_USER_API_TOKEN' }` if `!config.sepay.userApiToken`.
    - Check count of open `PENDING_PAYMENT` / `PARTIALLY_PAID` payments from last 24h; if `0`, return `{ skipped: true, reason: 'NO_OPEN_PAYMENTS' }`.
    - Fetch `GET ${config.sepay.apiBaseUrl}/transactions/list?limit=50` with `Authorization: Bearer ${config.sepay.userApiToken}`, normalize SePay list fields (`id`, `amount_in`, `transaction_content`, `bank_brand_name`, `account_number`, `reference_number`, `transaction_date`), and process each incoming transaction through `processIncomingTransaction(..., { source: 'reconcile_cron' })`.
  - Admin helpers:
    - `listUnmatched({ status = 'OPEN', page = 1, pageSize = 20 })`
    - `reconcileUnmatched(unmatchedId, { action, orderId, note }, adminId)`: when `action === 'match_order'`, validates `orderId`, finds `Payment` (or late recovery if `CANCELLED`), transitions payment inside transaction and marks `UnmatchedTransaction` `RESOLVED_MATCHED` + `resolvedOrderId` + `resolvedBy` + `resolvedAt`.
    - `listExceptions({ page = 1, pageSize = 20 })`: returns orders/payments where `status IN ['PARTIALLY_PAID', 'NEED_REFUND']` OR `overpaidAmount > 0`.
    - `refundOrder(orderId, { note }, adminId)`: loads `Payment` for `orderId` (must be `PAID` or `NEED_REFUND`), calls `transitionPaymentState(..., 'REFUNDED', { reason: 'ADMIN_REFUND', actor: 'admin:' + adminId, refundNote: note })`.

- [ ] **Step 3: Create `paymentController.js`, `payment.routes.js`, mount in `routes/index.js`, and start workers in `server.js` (only when `config.env !== 'test'`)**
  - Ensure **NO simulate/mock webhook route** is registered.

---

### Task 5: Comprehensive SePay Webhook & Edge-Case Tests (`backend/tests/sepay-webhook.test.js`)

**Files:**
- Create: `backend/tests/sepay-webhook.test.js`

- [ ] **Step 1: Write thorough tests covering every requirement & edge case**
  - Configure test webhook secret via `config.sepay.webhookApiKey` (restored in `after` hook) and test:
    1. Auth & security: missing key (`401`), wrong key (`401`), unequal-length key (`401` no RangeError), `allowedIps` mismatch (`403`), float `transferAmount` (`400`), outgoing `transferType: 'out'` ignored (`200`).
    2. Happy path: bank order reserves `stock` -> `reservedStock`, returns `qrUrl` & `orderCode`; valid webhook `Apikey` marks `Payment=PAID`, `Order.paymentStatus=paid`, `Order.status=confirmed`, `reservedStock=0`, `PaymentTransaction` recorded.
    3. Duplicate webhook: second POST with same `id` returns `200 { ok: true, duplicated: true }`, `paidAmount` unchanged.
    4. Underpayment then completion: first transfer `< total` -> `PARTIALLY_PAID`, `reservedStock` still held; second transfer covering balance -> `PAID` & `confirmed`.
    5. Overpayment: transfer `> total` -> `PAID` + `overpaidAmount === excess` on both `Payment` and `Order`.
    6. Unmatched content & Admin manual reconcile: webhook without `DH...` creates `UnmatchedTransaction` (`OPEN`); Admin calls `POST /api/admin/payments/unmatched/:id/reconcile` with `action: 'match_order'` -> order becomes `PAID`, unmatched becomes `RESOLVED_MATCHED`.
    7. Reservation TTL expiration (`runExpireReservationsOnce`): expired `PENDING_PAYMENT` -> `CANCELLED`, `stock` restored, `reservedStock=0`, promo `usedCount` released; expired `PARTIALLY_PAID` -> `NEED_REFUND`, `stock` restored, `reservedStock=0`.
    8. Late payment after auto-cancel:
       - With available stock -> `LATE_RECOVERED` (`PAID`, `recoveredFromCancelled: true`, stock decremented).
       - With exhausted stock on 2nd product -> `LATE_NEED_REFUND` (`NEED_REFUND`, item 1 stock untouched).
    9. Admin refund: `PAID -> REFUNDED` and `NEED_REFUND -> REFUNDED`; rejects refund on `PENDING_PAYMENT` (`409`).
    10. Reconciliation cron (`runReconcileOnce({ fetchImpl })`): catches missed webhook from mocked SePay API list and stays idempotent on repeat run.

- [ ] **Step 2: Run full test suite**
  - Run: `cd backend && npm test`
  - Expected: All existing 90 tests + all new state machine & webhook tests PASS 100%.

---

### Task 6: Frontend Real-Time SePay VietQR & Admin Payment Reconciliation UI

**Files:**
- Modify: `frontend/src/lib/format.js`
- Create: `frontend/src/components/order/SepayPaymentBox.jsx`
- Modify: `frontend/src/app/orders/[id]/page.jsx`
- Create: `frontend/src/components/admin/PaymentReconciliationPanel.jsx`
- Modify: `frontend/src/app/admin/orders/page.jsx`

- [ ] **Step 1: Update `frontend/src/lib/format.js`**
  - Add `partially_paid` (`'Thanh toán một phần'`), `need_refund` (`'Chờ hoàn tiền'`), and `refunded` (`'Đã hoàn tiền'`) to `PAYMENT_STATUS_CONFIG`.

- [ ] **Step 2: Create `frontend/src/components/order/SepayPaymentBox.jsx` & integrate into `frontend/src/app/orders/[id]/page.jsx`**
  - Display SePay VietQR image (`order.paymentInfo?.qrUrl`), bank details (`name`, `account`, `holder`), exact amount to transfer (`remainingAmount` when `partially_paid`, else `total`), transfer content (`transferContent`), copy-to-clipboard buttons for account number & `transferContent`, and live 15-minute countdown timer (`expiresAt`).
  - Show status callouts for `partially_paid` (paid amount vs. remaining amount), `need_refund`, `refunded`, and `paid` with `overpaidAmount > 0`.
  - In `orders/[id]/page.jsx`, connect `EventSource('/api/orders/' + order._id + '/events')` for real-time `payment_update` SSE updates when `order.paymentMethod === 'bank'` and `['pending', 'partially_paid'].includes(order.paymentStatus)` and `!isCancelled`, plus a 4-second polling fallback that **automatically stops** once `paymentStatus` becomes terminal (`paid`, `need_refund`, `refunded`, `unpaid`) or `status === 'cancelled'` or countdown expires (+ grace).
  - **ZERO webhook simulation buttons!**

- [ ] **Step 3: Create `frontend/src/components/admin/PaymentReconciliationPanel.jsx` & integrate into `frontend/src/app/admin/orders/page.jsx`**
  - Add tab switcher in `/admin/orders`: **Tất cả đơn hàng** | **Đối soát & Ngoại lệ SePay**.
  - `PaymentReconciliationPanel` renders:
    1. **Giao dịch sai nội dung (Unmatched Transactions)** (`GET /api/admin/payments/unmatched`): table showing SePay transaction ID, amount, raw transfer content, date, and action controls allowing Admin to enter/select an `orderId` to khớp đơn thủ công (`match_order`), đánh dấu hoàn tiền (`mark_refunded`), or bỏ qua (`ignore`).
    2. **Đơn hàng ngoại lệ thanh toán** (`GET /api/admin/payments/exceptions`): lists `PARTIALLY_PAID`, `NEED_REFUND`, and `overpaidAmount > 0` orders with **"Xác nhận đã hoàn tiền"** button (`POST /api/admin/orders/:id/refund`) for `paid`/`need_refund` orders.
  - **ZERO webhook simulation buttons!**

- [ ] **Step 4: Run `cd frontend && npm run build`**
  - Expected: Clean production build with exit code `0`.
