import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import {
  buildOrderPaymentEventPayload,
  emitOrderPaymentUpdate,
  enqueueAsyncTask,
} from '../lib/paymentEvents.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { UnmatchedTransaction } from '../models/UnmatchedTransaction.js';
import * as orderService from './orderService.js';
import { handleLatePaymentException, transitionPaymentState } from './paymentStateMachine.js';

const ORDER_CODE_REGEX = /\bDH[0-9A-F]{8}\b/i;

// In-process per-transaction serialization prevents concurrent duplicate webhooks
// from racing on CANCELLED late-recovery flows before PaymentTransaction commits.
const inFlightTxnLocks = new Map();

async function withTxnLock(key, fn) {
  const previous = inFlightTxnLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current, () => current);
  inFlightTxnLocks.set(key, chained);

  await previous.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (inFlightTxnLocks.get(key) === chained) {
      inFlightTxnLocks.delete(key);
    }
  }
}

function sha256Digest(value) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest();
}

function normalizeIp(ip) {
  const raw = String(ip || '').trim();
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

function parseTransactionDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSepayListAmount(raw) {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+(?:\.0+)?$/.test(trimmed)) {
      const value = Number.parseInt(trimmed.split('.')[0], 10);
      return Number.isSafeInteger(value) ? value : null;
    }
  }
  return null;
}

function buildProviderTxnId(payload) {
  if (payload?.id !== undefined && payload?.id !== null && String(payload.id).trim() !== '') {
    return String(payload.id).trim();
  }
  const ref = payload?.referenceCode || payload?.reference_number || 'noref';
  const dt = payload?.transactionDate || payload?.transaction_date || 'nodate';
  return `sepay-${ref}-${dt}`;
}

function enqueueOrderUpdateEvent(order, payment) {
  if (!order) return;
  enqueueAsyncTask('sse:payment_update', () => {
    emitOrderPaymentUpdate(order._id, buildOrderPaymentEventPayload(order, payment));
  });
}

async function runWithTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Verifies SePay webhook API key using constant-time SHA-256 comparison
 * and checks optional SEPAY_ALLOWED_IPS whitelist.
 */
export function verifyWebhookAuth(req) {
  const expectedKey = config.sepay.webhookApiKey;
  const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization.trim() : '';
  const match = authHeader.match(/^(?:Apikey|Bearer)\s+(.+)$/i);
  const providedKey = match ? match[1].trim() : '';

  const expectedDigest = sha256Digest(expectedKey);
  const providedDigest = sha256Digest(providedKey);
  const isDigestMatch = crypto.timingSafeEqual(expectedDigest, providedDigest);

  if (!expectedKey || !providedKey || !isDigestMatch) {
    throw new AppError(401, 'UNAUTHORIZED_WEBHOOK', 'API Key webhook không hợp lệ');
  }

  const allowedIps = config.sepay.allowedIps;
  if (allowedIps.length > 0) {
    const requestIp = normalizeIp(req.ip);
    const allowedSet = new Set(allowedIps.map(normalizeIp));
    if (!allowedSet.has(requestIp)) {
      throw new AppError(403, 'FORBIDDEN_IP', 'IP không nằm trong danh sách cho phép');
    }
  }
}

/**
 * Extracts normalized DHxxxxxxxx order code from SePay `code` or `content`.
 */
export function extractOrderCode(payload) {
  for (const candidate of [payload?.code, payload?.content]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const found = candidate.match(ORDER_CODE_REGEX);
    if (found) return found[0].toUpperCase();
  }
  return null;
}

/**
 * Shared state-application helper for non-CANCELLED payments inside an active MongoDB transaction.
 */
async function applyActiveOrderPayment({
  payment,
  amount,
  providerTxnId,
  actor,
  reasonPrefix,
  session,
}) {
  if (payment.status === 'PENDING_PAYMENT' || payment.status === 'PARTIALLY_PAID') {
    if (amount === 0 && payment.expectedAmount > 0) {
      const order = await Order.findById(payment.orderId).session(session);
      return { matchStatus: 'ALREADY_SETTLED', order, payment };
    }

    const newTotal = payment.paidAmount + amount;
    if (newTotal < payment.expectedAmount) {
      if (payment.status === 'PENDING_PAYMENT') {
        const { payment: updatedPayment, order: updatedOrder } = await transitionPaymentState({
          paymentId: payment._id,
          targetState: 'PARTIALLY_PAID',
          reason: `${reasonPrefix}_PARTIAL_PAYMENT`,
          actor,
          providerTxnId,
          amount,
          paidAmountDelta: amount,
          session,
        });
        return { matchStatus: 'MATCHED_PARTIAL', order: updatedOrder, payment: updatedPayment };
      }

      // Stays PARTIALLY_PAID (no status mutation); accumulate paidAmount and append audit log.
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'PARTIALLY_PAID', paidAmount: payment.paidAmount },
        {
          $set: { paidAmount: newTotal },
          $push: {
            stateHistory: {
              from: 'PARTIALLY_PAID',
              to: 'PARTIALLY_PAID',
              reason: `${reasonPrefix}_PARTIAL_PAYMENT`,
              actor,
              providerTxnId: providerTxnId ? String(providerTxnId) : null,
              amount,
              timestamp: new Date(),
            },
          },
        },
        { returnDocument: 'after', session },
      );
      if (!updatedPayment) {
        throw new AppError(409, 'CONFLICT', 'Trạng thái thanh toán vừa được cập nhật, vui lòng thử lại');
      }
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: payment.orderId },
        { $set: { paidAmount: newTotal } },
        { returnDocument: 'after', session },
      );
      return { matchStatus: 'MATCHED_PARTIAL', order: updatedOrder, payment: updatedPayment };
    }

    const isOverpaid = newTotal > payment.expectedAmount;
    const { payment: updatedPayment, order: updatedOrder } = await transitionPaymentState({
      paymentId: payment._id,
      targetState: 'PAID',
      reason: isOverpaid ? `${reasonPrefix}_OVERPAYMENT` : `${reasonPrefix}_FULL_PAYMENT`,
      actor,
      providerTxnId,
      amount,
      paidAmountDelta: amount,
      autoConfirmOrder: true,
      session,
    });
    return {
      matchStatus: isOverpaid ? 'MATCHED_OVERPAID' : 'MATCHED_PAID',
      order: updatedOrder,
      payment: updatedPayment,
    };
  }

  const historyEntry = {
    from: payment.status,
    to: payment.status,
    reason: 'ADDITIONAL_TRANSFER_ON_SETTLED_ORDER',
    actor,
    providerTxnId: providerTxnId ? String(providerTxnId) : null,
    amount,
    timestamp: new Date(),
  };

  const shouldTrackOverpaid = amount > 0 && (payment.status === 'PAID' || payment.status === 'NEED_REFUND');
  const paymentUpdate = shouldTrackOverpaid
    ? { $inc: { overpaidAmount: amount }, $push: { stateHistory: historyEntry } }
    : { $push: { stateHistory: historyEntry } };

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: payment.status },
    paymentUpdate,
    { returnDocument: 'after', session },
  );
  if (!updatedPayment) {
    throw new AppError(409, 'CONFLICT', 'Trạng thái thanh toán vừa được cập nhật, vui lòng thử lại');
  }

  const updatedOrder = shouldTrackOverpaid
    ? await Order.findOneAndUpdate(
        { _id: payment.orderId },
        { $inc: { overpaidAmount: amount } },
        { returnDocument: 'after', session },
      )
    : await Order.findById(payment.orderId).session(session);

  return { matchStatus: 'ALREADY_SETTLED', order: updatedOrder, payment: updatedPayment };
}

async function processLateCancelledPayment(txFields, payment, actor) {
  if (txFields.transferAmount === 0 && payment.expectedAmount > 0) {
    try {
      await PaymentTransaction.create({
        ...txFields,
        orderId: payment.orderId,
        paymentId: payment._id,
        matchStatus: 'ALREADY_SETTLED',
      });
    } catch (err) {
      if (err?.code === 11000) {
        return {
          done: true,
          response: {
            ok: true,
            duplicated: true,
            matchStatus: 'ALREADY_SETTLED',
            orderCode: payment.orderCode,
          },
        };
      }
      throw err;
    }
    return {
      done: true,
      response: {
        ok: true,
        matchStatus: 'ALREADY_SETTLED',
        orderCode: payment.orderCode,
        orderId: String(payment.orderId),
      },
    };
  }

  let lateResult;
  try {
    lateResult = await handleLatePaymentException({
      paymentId: payment._id,
      transferAmount: txFields.transferAmount,
      providerTxnId: txFields.providerTxnId,
      actor,
    });
  } catch (err) {
    if (err instanceof AppError && (err.code === 'CONFLICT' || err.code === 'INVALID_STATE_TRANSITION')) {
      const existing = await PaymentTransaction.findOne({ providerTxnId: txFields.providerTxnId }).lean();
      if (existing) {
        return {
          done: true,
          response: {
            ok: true,
            duplicated: true,
            matchStatus: existing.matchStatus,
            orderCode: existing.extractedOrderCode,
          },
        };
      }
      return { done: false, retry: true };
    }
    throw err;
  }

  try {
    await PaymentTransaction.create({
      ...txFields,
      orderId: lateResult.order._id,
      paymentId: lateResult.payment._id,
      matchStatus: lateResult.outcome,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return {
        done: true,
        response: {
          ok: true,
          duplicated: true,
          matchStatus: lateResult.outcome,
          orderCode: lateResult.order.orderCode,
        },
      };
    }
    throw err;
  }

  enqueueOrderUpdateEvent(lateResult.order, lateResult.payment);
  if (lateResult.outcome === 'LATE_NEED_REFUND') {
    enqueueAsyncTask('alert:late_need_refund', () => {
      console.warn(
        `[sepay] Late payment for order ${lateResult.order.orderCode} could not recover stock -> NEED_REFUND`,
      );
    });
  }

  return {
    done: true,
    response: {
      ok: true,
      matchStatus: lateResult.outcome,
      orderCode: lateResult.order.orderCode,
      orderId: String(lateResult.order._id),
    },
  };
}

/**
 * Idempotently processes a normalized SePay transaction from webhook or reconcile cronjob.
 */
export async function processIncomingTransaction(payload, { source = 'webhook' } = {}) {
  const providerTxnId = buildProviderTxnId(payload);
  const transferAmount = payload.transferAmount;
  if (!Number.isSafeInteger(transferAmount) || transferAmount < 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'Số tiền giao dịch phải là số nguyên không âm (VNĐ)');
  }

  const fastExisting = await PaymentTransaction.findOne({ providerTxnId }).lean();
  if (fastExisting) {
    return {
      ok: true,
      duplicated: true,
      matchStatus: fastExisting.matchStatus,
      orderCode: fastExisting.extractedOrderCode,
    };
  }

  const actor = source === 'reconcile_cron' ? 'system:cron' : 'system:webhook';
  const reasonPrefix = source === 'reconcile_cron' ? 'RECONCILE' : 'WEBHOOK';
  const extractedOrderCode = extractOrderCode(payload);
  const txFields = {
    providerTxnId,
    provider: 'sepay',
    source,
    gateway: String(payload.gateway || ''),
    accountNumber: String(payload.accountNumber || ''),
    transferType: payload.transferType,
    transferAmount,
    content: String(payload.content || ''),
    extractedOrderCode,
    referenceCode: String(payload.referenceCode || ''),
    transactionDate: parseTransactionDate(payload.transactionDate),
    rawPayload: payload,
    processedAt: new Date(),
  };

  return withTxnLock(providerTxnId, async () => {
    const existing = await PaymentTransaction.findOne({ providerTxnId }).lean();
    if (existing) {
      return {
        ok: true,
        duplicated: true,
        matchStatus: existing.matchStatus,
        orderCode: existing.extractedOrderCode,
      };
    }

    if (payload.transferType !== 'in') {
      try {
        await PaymentTransaction.create({ ...txFields, matchStatus: 'IGNORED_OUTGOING' });
      } catch (err) {
        if (err?.code === 11000) {
          return { ok: true, duplicated: true, matchStatus: 'IGNORED_OUTGOING', orderCode: extractedOrderCode };
        }
        throw err;
      }
      return { ok: true, matchStatus: 'IGNORED_OUTGOING', orderCode: extractedOrderCode };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const currentPayment = extractedOrderCode
        ? await Payment.findOne({ orderCode: extractedOrderCode }).lean()
        : null;

      if (currentPayment && currentPayment.status === 'CANCELLED') {
        const lateOutcome = await processLateCancelledPayment(txFields, currentPayment, actor);
        if (lateOutcome.done) return lateOutcome.response;
        continue;
      }

      let txOutcome;
      try {
        txOutcome = await runWithTransaction(async (session) => {
          const dupInTx = await PaymentTransaction.findOne({ providerTxnId }).session(session);
          if (dupInTx) {
            return {
              kind: 'duplicated',
              matchStatus: dupInTx.matchStatus,
              orderCode: dupInTx.extractedOrderCode,
            };
          }

          const payment = extractedOrderCode
            ? await Payment.findOne({ orderCode: extractedOrderCode }).session(session)
            : null;

          if (payment && payment.status === 'CANCELLED') {
            return { kind: 'retry_cancelled' };
          }

          if (!payment) {
            const [paymentTxn] = await PaymentTransaction.create(
              [{ ...txFields, matchStatus: 'UNMATCHED' }],
              { session },
            );
            await UnmatchedTransaction.create(
              [
                {
                  providerTxnId,
                  paymentTransactionId: paymentTxn._id,
                  amount: transferAmount,
                  content: txFields.content,
                  gateway: txFields.gateway,
                  accountNumber: txFields.accountNumber,
                  transactionDate: txFields.transactionDate,
                  resolutionStatus: 'OPEN',
                },
              ],
              { session },
            );
            return { kind: 'unmatched', orderCode: extractedOrderCode };
          }

          const applied = await applyActiveOrderPayment({
            payment,
            amount: transferAmount,
            providerTxnId,
            actor,
            reasonPrefix,
            session,
          });

          await PaymentTransaction.create(
            [
              {
                ...txFields,
                orderId: applied.order._id,
                paymentId: applied.payment._id,
                matchStatus: applied.matchStatus,
              },
            ],
            { session },
          );

          return {
            kind: 'matched',
            matchStatus: applied.matchStatus,
            order: applied.order,
            payment: applied.payment,
          };
        });
      } catch (err) {
        if (err?.code === 11000) {
          return { ok: true, duplicated: true, orderCode: extractedOrderCode };
        }
        if (err instanceof AppError && err.code === 'CONFLICT' && attempt === 0) {
          continue;
        }
        throw err;
      }

      if (txOutcome.kind === 'retry_cancelled') {
        continue;
      }
      if (txOutcome.kind === 'duplicated') {
        return {
          ok: true,
          duplicated: true,
          matchStatus: txOutcome.matchStatus,
          orderCode: txOutcome.orderCode,
        };
      }
      if (txOutcome.kind === 'unmatched') {
        enqueueAsyncTask('alert:unmatched_tx', () => {
          console.warn(`[sepay] Unmatched transfer txn=${providerTxnId} amount=${transferAmount}`);
        });
        return { ok: true, matchStatus: 'UNMATCHED', orderCode: txOutcome.orderCode };
      }

      enqueueOrderUpdateEvent(txOutcome.order, txOutcome.payment);
      if (txOutcome.matchStatus === 'MATCHED_OVERPAID' || txOutcome.matchStatus === 'ALREADY_SETTLED') {
        enqueueAsyncTask('alert:payment_exception', () => {
          console.warn(
            `[sepay] Payment exception ${txOutcome.matchStatus} order=${txOutcome.order.orderCode} txn=${providerTxnId}`,
          );
        });
      }

      return {
        ok: true,
        matchStatus: txOutcome.matchStatus,
        orderCode: txOutcome.order.orderCode,
        orderId: String(txOutcome.order._id),
      };
    }

    throw new AppError(409, 'CONFLICT', 'Không thể xử lý giao dịch do xung đột trạng thái');
  });
}

/**
 * Releases expired PENDING_PAYMENT reservations and moves expired PARTIALLY_PAID
 * orders past their grace window into NEED_REFUND.
 */
export async function runExpireReservationsOnce(now = new Date()) {
  let cancelledCount = 0;
  let needRefundCount = 0;

  const expiredPending = await Payment.find({
    status: 'PENDING_PAYMENT',
    expiresAt: { $lte: now },
  })
    .select('_id')
    .sort({ expiresAt: 1 })
    .lean();

  for (const item of expiredPending) {
    try {
      const { payment, order } = await transitionPaymentState({
        paymentId: item._id,
        targetState: 'CANCELLED',
        reason: 'RESERVATION_EXPIRED',
        actor: 'system:ttl_worker',
      });
      emitOrderPaymentUpdate(order._id, buildOrderPaymentEventPayload(order, payment));
      cancelledCount += 1;
    } catch (err) {
      if (err instanceof AppError && (err.code === 'CONFLICT' || err.code === 'INVALID_STATE_TRANSITION')) {
        continue;
      }
      throw err;
    }
  }

  const expiredPartial = await Payment.find({
    status: 'PARTIALLY_PAID',
    $or: [
      { partialGraceExpiresAt: { $ne: null, $lte: now } },
      { partialGraceExpiresAt: null, expiresAt: { $lte: now } },
    ],
  })
    .select('_id')
    .sort({ partialGraceExpiresAt: 1, expiresAt: 1 })
    .lean();

  for (const item of expiredPartial) {
    try {
      const { payment, order } = await transitionPaymentState({
        paymentId: item._id,
        targetState: 'NEED_REFUND',
        reason: 'PARTIAL_PAYMENT_EXPIRED',
        actor: 'system:ttl_worker',
      });
      emitOrderPaymentUpdate(order._id, buildOrderPaymentEventPayload(order, payment));
      needRefundCount += 1;
    } catch (err) {
      if (err instanceof AppError && (err.code === 'CONFLICT' || err.code === 'INVALID_STATE_TRANSITION')) {
        continue;
      }
      throw err;
    }
  }

  return { cancelledCount, needRefundCount };
}

/**
 * Polls SePay User API to catch any missed webhooks for open bank orders in the last 24h.
 */
export async function runReconcileOnce({ fetchImpl = globalThis.fetch } = {}) {
  if (!config.sepay.userApiToken) {
    return { skipped: true, reason: 'MISSING_USER_API_TOKEN' };
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const openCount = await Payment.countDocuments({
    status: { $in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] },
    createdAt: { $gte: since },
  });
  if (openCount === 0) {
    return { skipped: true, reason: 'NO_OPEN_PAYMENTS' };
  }

  const response = await fetchImpl(`${config.sepay.apiBaseUrl}/transactions/list?limit=50`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.sepay.userApiToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new AppError(502, 'SEPAY_API_ERROR', `SePay API trả về mã ${response.status}`);
  }

  const body = await response.json();
  const rawList = Array.isArray(body?.transactions) ? body.transactions : [];

  let processedCount = 0;
  let duplicatedCount = 0;

  for (const tx of rawList) {
    const amountIn = parseSepayListAmount(tx?.amount_in ?? tx?.transferAmount) ?? 0;
    const amountOut = parseSepayListAmount(tx?.amount_out) ?? 0;
    const isOutgoing = tx?.transferType === 'out' || (amountIn === 0 && amountOut > 0);
    if (isOutgoing || amountIn <= 0) {
      continue;
    }

    const normalized = {
      id: buildProviderTxnId(tx),
      gateway: String(tx?.bank_brand_name ?? tx?.gateway ?? ''),
      transactionDate: tx?.transaction_date ?? tx?.transactionDate ?? null,
      accountNumber: String(tx?.account_number ?? tx?.accountNumber ?? ''),
      code: tx?.code ?? null,
      content: String(tx?.transaction_content ?? tx?.content ?? ''),
      transferType: 'in',
      transferAmount: amountIn,
      referenceCode: String(tx?.reference_number ?? tx?.referenceCode ?? ''),
    };

    const res = await processIncomingTransaction(normalized, { source: 'reconcile_cron' });
    if (res.duplicated) {
      duplicatedCount += 1;
    } else {
      processedCount += 1;
    }
  }

  return {
    skipped: false,
    fetchedCount: rawList.length,
    processedCount,
    duplicatedCount,
  };
}

export async function listUnmatched({ status = 'OPEN', page = 1, pageSize = 20 } = {}) {
  const filter = status && status !== 'ALL' ? { resolutionStatus: status } : {};
  const [items, total] = await Promise.all([
    UnmatchedTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    UnmatchedTransaction.countDocuments(filter),
  ]);
  return { items, total, page, pageSize };
}

export async function reconcileUnmatched(unmatchedId, { action, orderId, note }, adminId) {
  const normalizedUnmatchedId = toObjectId(unmatchedId);
  const normalizedAdminId = toObjectId(String(adminId));
  const actor = `admin:${String(normalizedAdminId)}`;

  return withTxnLock(`unmatched:${String(normalizedUnmatchedId)}`, async () => {
    const existing = await UnmatchedTransaction.findById(normalizedUnmatchedId).lean();
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy giao dịch chưa khớp');
    }
    if (existing.resolutionStatus !== 'OPEN') {
      throw new AppError(409, 'ALREADY_RESOLVED', 'Giao dịch này đã được đối soát trước đó');
    }

    if (action === 'mark_refunded' || action === 'ignore') {
      const targetResolution = action === 'mark_refunded' ? 'RESOLVED_REFUNDED' : 'IGNORED';
      const updated = await UnmatchedTransaction.findOneAndUpdate(
        { _id: existing._id, resolutionStatus: 'OPEN' },
        {
          $set: {
            resolutionStatus: targetResolution,
            resolvedBy: normalizedAdminId,
            resolvedNote: note || '',
            resolvedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw new AppError(409, 'CONFLICT', 'Giao dịch vừa được cập nhật bởi phiên khác');
      }
      return { ok: true, unmatched: updated, order: null, payment: null };
    }

    const normalizedOrderId = toObjectId(orderId);
    const targetOrder = await Order.findById(normalizedOrderId).lean();
    if (!targetOrder) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
    }
    if (targetOrder.paymentMethod !== 'bank') {
      throw new AppError(409, 'INVALID_PAYMENT_METHOD', 'Chỉ có thể đối soát giao dịch vào đơn chuyển khoản');
    }

    const targetPayment = await Payment.findOne({ orderId: targetOrder._id }).lean();
    if (!targetPayment) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin thanh toán của đơn hàng');
    }
    if (targetPayment.status === 'REFUNDED') {
      throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Đơn hàng đã hoàn tiền, không thể khớp giao dịch');
    }
    if (existing.amount <= 0 && targetPayment.expectedAmount > 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Không thể khớp giao dịch 0 VNĐ vào đơn hàng');
    }

    if (targetPayment.status === 'CANCELLED') {
      const lateResult = await handleLatePaymentException({
        paymentId: targetPayment._id,
        transferAmount: existing.amount,
        providerTxnId: existing.providerTxnId,
        actor,
      });

      const resolvedAt = new Date();
      const [updatedUnmatched] = await Promise.all([
        UnmatchedTransaction.findOneAndUpdate(
          { _id: existing._id, resolutionStatus: 'OPEN' },
          {
            $set: {
              resolutionStatus: 'RESOLVED_MATCHED',
              resolvedOrderId: lateResult.order._id,
              resolvedBy: normalizedAdminId,
              resolvedNote: note || '',
              resolvedAt,
            },
          },
          { returnDocument: 'after' },
        ),
        PaymentTransaction.updateOne(
          { _id: existing.paymentTransactionId },
          {
            $set: {
              orderId: lateResult.order._id,
              paymentId: lateResult.payment._id,
              matchStatus: lateResult.outcome,
            },
          },
        ),
      ]);

      enqueueOrderUpdateEvent(lateResult.order, lateResult.payment);
      return {
        ok: true,
        unmatched: updatedUnmatched,
        order: orderService.toResult(lateResult.order, lateResult.payment),
        payment: lateResult.payment,
      };
    }

    const outcome = await runWithTransaction(async (session) => {
      const updatedUnmatched = await UnmatchedTransaction.findOneAndUpdate(
        { _id: existing._id, resolutionStatus: 'OPEN' },
        {
          $set: {
            resolutionStatus: 'RESOLVED_MATCHED',
            resolvedOrderId: targetOrder._id,
            resolvedBy: normalizedAdminId,
            resolvedNote: note || '',
            resolvedAt: new Date(),
          },
        },
        { returnDocument: 'after', session },
      );
      if (!updatedUnmatched) {
        throw new AppError(409, 'CONFLICT', 'Giao dịch vừa được cập nhật bởi phiên khác');
      }

      const freshPayment = await Payment.findById(targetPayment._id).session(session);
      if (!freshPayment || freshPayment.status === 'REFUNDED' || freshPayment.status === 'CANCELLED') {
        throw new AppError(409, 'CONFLICT', 'Trạng thái đơn hàng vừa thay đổi, vui lòng thử lại');
      }

      const applied = await applyActiveOrderPayment({
        payment: freshPayment,
        amount: existing.amount,
        providerTxnId: existing.providerTxnId,
        actor,
        reasonPrefix: 'ADMIN_RECONCILE',
        session,
      });

      await PaymentTransaction.updateOne(
        { _id: existing.paymentTransactionId },
        {
          $set: {
            orderId: applied.order._id,
            paymentId: applied.payment._id,
            matchStatus: applied.matchStatus,
          },
        },
        { session },
      );

      return {
        unmatched: updatedUnmatched,
        order: applied.order,
        payment: applied.payment,
      };
    });

    enqueueOrderUpdateEvent(outcome.order, outcome.payment);
    return {
      ok: true,
      unmatched: outcome.unmatched,
      order: orderService.toResult(outcome.order, outcome.payment),
      payment: outcome.payment,
    };
  });
}

export async function listExceptions({ page = 1, pageSize = 20 } = {}) {
  const filter = {
    $or: [{ status: { $in: ['PARTIALLY_PAID', 'NEED_REFUND'] } }, { overpaidAmount: { $gt: 0 } }],
  };
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('orderId', '_id orderCode status paymentStatus total paidAmount overpaidAmount shippingAddress createdAt updatedAt')
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Payment.countDocuments(filter),
  ]);
  return { items, total, page, pageSize };
}

export async function refundOrder(orderId, { note } = {}, adminId) {
  const normalizedOrderId = toObjectId(orderId);
  const payment = await Payment.findOne({ orderId: normalizedOrderId }).lean();
  if (!payment) {
    const order = await Order.findById(normalizedOrderId).lean();
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
    }
    throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Đơn hàng không có giao dịch chuyển khoản để hoàn tiền');
  }

  const { payment: updatedPayment, order: updatedOrder } = await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'REFUNDED',
    reason: 'ADMIN_REFUND',
    actor: `admin:${String(adminId)}`,
    refundNote: note || '',
  });

  emitOrderPaymentUpdate(updatedOrder._id, buildOrderPaymentEventPayload(updatedOrder, updatedPayment));
  return orderService.toResult(updatedOrder, updatedPayment);
}

/**
 * Starts non-overlapping reservation-expiry and SePay reconciliation timers in non-test environments.
 */
export function startPaymentWorkers() {
  if (config.env === 'test') {
    return () => {};
  }

  let expiring = false;
  let reconciling = false;

  const expireTimer = setInterval(async () => {
    if (expiring) return;
    expiring = true;
    try {
      await runExpireReservationsOnce();
    } catch (err) {
      console.error('[worker:expireReservations]', err);
    } finally {
      expiring = false;
    }
  }, config.payment.expireIntervalMs);
  expireTimer.unref?.();

  const reconcileTimer = setInterval(async () => {
    if (reconciling) return;
    reconciling = true;
    try {
      await runReconcileOnce();
    } catch (err) {
      console.error('[worker:reconcile]', err);
    } finally {
      reconciling = false;
    }
  }, config.payment.reconcileIntervalMs);
  reconcileTimer.unref?.();

  return () => {
    clearInterval(expireTimer);
    clearInterval(reconcileTimer);
  };
}
