'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Link2,
  Ban,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import { formatVND, formatDate, getPaymentStatus } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const RESOLUTION_STATUS_BADGE = {
  OPEN: {
    label: 'Chưa xử lý',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  RESOLVED_MATCHED: {
    label: 'Đã khớp đơn',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  RESOLVED_REFUNDED: {
    label: 'Đã đánh dấu hoàn tiền',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  IGNORED: {
    label: 'Đã bỏ qua',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  },
};

function normalizeExceptionItem(raw) {
  const orderObj =
    raw?.orderId && typeof raw.orderId === 'object'
      ? raw.orderId
      : raw?.order && typeof raw.order === 'object'
      ? raw.order
      : raw;
  const paymentObj =
    raw?.payment && typeof raw.payment === 'object'
      ? raw.payment
      : raw?.expectedAmount !== undefined
      ? raw
      : null;

  const orderId = String(
    orderObj?._id || (typeof raw?.orderId === 'string' ? raw.orderId : '') || raw?._id || ''
  );
  const orderCode =
    raw?.orderCode ||
    orderObj?.orderCode ||
    (orderId ? `DH${orderId.slice(-8).toUpperCase()}` : 'N/A');

  const rawPaymentState =
    paymentObj?.status ||
    (['PENDING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'NEED_REFUND', 'REFUNDED'].includes(
      raw?.status
    )
      ? raw.status
      : '');

  const stateToOrderPaymentStatus = {
    PENDING_PAYMENT: 'pending',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid',
    CANCELLED: 'unpaid',
    NEED_REFUND: 'need_refund',
    REFUNDED: 'refunded',
  };

  const paymentStatus =
    orderObj?.paymentStatus ||
    raw?.paymentStatus ||
    stateToOrderPaymentStatus[rawPaymentState] ||
    '';

  const expectedAmount = paymentObj?.expectedAmount ?? raw?.expectedAmount ?? orderObj?.total ?? 0;
  const paidAmount = paymentObj?.paidAmount ?? raw?.paidAmount ?? orderObj?.paidAmount ?? 0;
  const overpaidAmount =
    paymentObj?.overpaidAmount ?? raw?.overpaidAmount ?? orderObj?.overpaidAmount ?? 0;

  const customerName =
    orderObj?.shippingAddress?.fullName ||
    raw?.userId?.fullName ||
    raw?.customerName ||
    'Khách hàng';
  const customerPhone = orderObj?.shippingAddress?.phone || raw?.userId?.phone || '';
  const updatedAt = raw?.updatedAt || orderObj?.updatedAt || raw?.createdAt || orderObj?.createdAt;
  const canRefund =
    (['paid', 'need_refund'].includes(paymentStatus) ||
      ['PAID', 'NEED_REFUND'].includes(rawPaymentState)) &&
    paymentStatus !== 'refunded' &&
    rawPaymentState !== 'REFUNDED';

  return {
    key: String(raw?._id || orderId),
    orderId,
    orderCode,
    paymentStatus,
    expectedAmount,
    paidAmount,
    overpaidAmount,
    remainingAmount: Math.max(0, expectedAmount - paidAmount),
    customerName,
    customerPhone,
    updatedAt,
    canRefund,
  };
}

export default function PaymentReconciliationPanel({ onDataUpdated }) {
  const toast = useToast();

  const [unmatchedItems, setUnmatchedItems] = useState([]);
  const [unmatchedTotal, setUnmatchedTotal] = useState(0);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [unmatchedStatus, setUnmatchedStatus] = useState('OPEN');
  const [loadingUnmatched, setLoadingUnmatched] = useState(true);

  const [exceptionItems, setExceptionItems] = useState([]);
  const [exceptionsTotal, setExceptionsTotal] = useState(0);
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [loadingExceptions, setLoadingExceptions] = useState(true);

  const [candidateOrders, setCandidateOrders] = useState([]);
  const [orderInputMap, setOrderInputMap] = useState({});
  const [noteInputMap, setNoteInputMap] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundNote, setRefundNote] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const pageSize = 20;

  const loadUnmatched = useCallback(async () => {
    try {
      setLoadingUnmatched(true);
      const params = new URLSearchParams({
        status: unmatchedStatus,
        page: String(unmatchedPage),
        pageSize: String(pageSize),
      });
      const data = await api.get(`/api/admin/payments/unmatched?${params.toString()}`);
      const list = Array.isArray(data) ? data : data?.items || [];
      setUnmatchedItems(list);
      setUnmatchedTotal(data?.total ?? list.length);
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách giao dịch sai nội dung');
      setUnmatchedItems([]);
      setUnmatchedTotal(0);
    } finally {
      setLoadingUnmatched(false);
    }
  }, [unmatchedStatus, unmatchedPage, toast]);

  const loadExceptions = useCallback(async () => {
    try {
      setLoadingExceptions(true);
      const params = new URLSearchParams({
        page: String(exceptionsPage),
        pageSize: String(pageSize),
      });
      const data = await api.get(`/api/admin/payments/exceptions?${params.toString()}`);
      const list = Array.isArray(data) ? data : data?.items || [];
      setExceptionItems(list.map(normalizeExceptionItem));
      setExceptionsTotal(data?.total ?? list.length);
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách đơn ngoại lệ thanh toán');
      setExceptionItems([]);
      setExceptionsTotal(0);
    } finally {
      setLoadingExceptions(false);
    }
  }, [exceptionsPage, toast]);

  const loadCandidateOrders = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/orders?page=1&pageSize=30');
      const list = Array.isArray(data) ? data : data?.items || [];
      setCandidateOrders(list.filter((o) => o.paymentMethod === 'bank'));
    } catch {
      // Optional quick-pick helper; Admin can still paste orderId manually
    }
  }, []);

  useEffect(() => {
    loadUnmatched();
  }, [loadUnmatched]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  useEffect(() => {
    loadCandidateOrders();
  }, [loadCandidateOrders]);

  const handleRefreshAll = () => {
    loadUnmatched();
    loadExceptions();
    loadCandidateOrders();
  };

  const resolveOrderIdInput = (rawVal) => {
    const trimmed = String(rawVal || '').trim();
    if (!trimmed) return '';
    if (OBJECT_ID_REGEX.test(trimmed)) return trimmed;
    const upper = trimmed.toUpperCase();
    const matched = candidateOrders.find(
      (o) =>
        o.orderCode?.toUpperCase() === upper ||
        `DH${String(o._id).slice(-8).toUpperCase()}` === upper ||
        String(o._id).slice(-8).toUpperCase() === upper.replace(/^#/, '')
    );
    return matched ? String(matched._id) : trimmed;
  };

  const handleReconcile = async (txn, action) => {
    const note = (noteInputMap[txn._id] || '').trim();
    const payload = { action };
    if (note) payload.note = note;

    if (action === 'match_order') {
      const resolvedOrderId = resolveOrderIdInput(orderInputMap[txn._id]);
      if (!OBJECT_ID_REGEX.test(resolvedOrderId)) {
        toast.error('Vui lòng chọn đơn hàng hoặc nhập đúng Order ID (24 ký tự hex)');
        return;
      }
      payload.orderId = resolvedOrderId;
    }

    try {
      setBusyId(txn._id);
      await api.post(`/api/admin/payments/unmatched/${txn._id}/reconcile`, payload);
      if (action === 'match_order') {
        toast.success(`Đã khớp giao dịch ${txn.providerTxnId} vào đơn hàng!`);
      } else if (action === 'mark_refunded') {
        toast.success(`Đã đánh dấu hoàn tiền cho giao dịch ${txn.providerTxnId}`);
      } else {
        toast.info(`Đã bỏ qua giao dịch ${txn.providerTxnId}`);
      }
      setOrderInputMap((prev) => {
        const next = { ...prev };
        delete next[txn._id];
        return next;
      });
      setNoteInputMap((prev) => {
        const next = { ...prev };
        delete next[txn._id];
        return next;
      });
      await Promise.all([loadUnmatched(), loadExceptions(), loadCandidateOrders()]);
      onDataUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Không thể đối soát giao dịch');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmRefund = async (e) => {
    e.preventDefault();
    if (!refundTarget?.orderId) return;
    try {
      setRefundSubmitting(true);
      const body = {};
      if (refundNote.trim()) body.note = refundNote.trim();
      await api.post(`/api/admin/orders/${refundTarget.orderId}/refund`, body);
      toast.success(`Đã xác nhận hoàn tiền cho đơn ${refundTarget.orderCode}!`);
      setRefundTarget(null);
      setRefundNote('');
      await loadExceptions();
      onDataUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Không thể xác nhận hoàn tiền');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const unmatchedTotalPages = Math.max(1, Math.ceil(unmatchedTotal / pageSize));
  const exceptionsTotalPages = Math.max(1, Math.ceil(exceptionsTotal / pageSize));

  return (
    <div className="space-y-8">
      {/* Summary / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-admin-border">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-semibold text-admin-muted">Giao dịch sai nội dung</p>
            <p className="text-2xl font-black text-amber-700 tabular-nums">{unmatchedTotal}</p>
          </div>
          <div className="h-8 w-px bg-admin-border hidden sm:block" />
          <div>
            <p className="text-xs font-semibold text-admin-muted">Đơn ngoại lệ / cần xử lý</p>
            <p className="text-2xl font-black text-rose-700 tabular-nums">{exceptionsTotal}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          disabled={loadingUnmatched || loadingExceptions}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-admin-border bg-admin-bg hover:bg-admin-soft text-xs font-bold text-brand-green transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loadingUnmatched || loadingExceptions ? 'animate-spin' : ''}`}
          />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Section 1: Unmatched Transactions */}
      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-brand-green flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Giao dịch sai / thiếu nội dung chuyển khoản (SePay)
            </h2>
            <p className="text-xs text-admin-muted mt-0.5">
              Các khoản tiền đã vào tài khoản nhưng thiếu hoặc sai mã đơn hàng DHxxxxxxxx.
            </p>
          </div>

          <div className="relative">
            <select
              value={unmatchedStatus}
              onChange={(e) => {
                setUnmatchedStatus(e.target.value);
                setUnmatchedPage(1);
              }}
              className="appearance-none pl-3.5 pr-8 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-bold text-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="OPEN">Chưa xử lý (OPEN)</option>
              <option value="RESOLVED_MATCHED">Đã khớp đơn</option>
              <option value="RESOLVED_REFUNDED">Đã đánh dấu hoàn tiền</option>
              <option value="IGNORED">Đã bỏ qua</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-admin-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Mã GD SePay</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Thời gian</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Số tiền</th>
                <th className="py-3.5 px-4">Nội dung chuyển khoản</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Đối soát thủ công</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loadingUnmatched ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-admin-muted">
                    Đang tải danh sách giao dịch chưa khớp...
                  </td>
                </tr>
              ) : unmatchedItems.length > 0 ? (
                unmatchedItems.map((txn) => {
                  const isBusy = busyId === txn._id;
                  const badge = RESOLUTION_STATUS_BADGE[txn.resolutionStatus] || {
                    label: txn.resolutionStatus,
                    className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
                  };

                  return (
                    <tr key={txn._id} className="hover:bg-admin-surface transition-colors align-top">
                      <td className="py-4 px-6 font-mono font-bold whitespace-nowrap">
                        <div>#{txn.providerTxnId}</div>
                        {(txn.gateway || txn.accountNumber) && (
                          <span className="text-[11px] font-sans font-normal text-admin-muted block mt-0.5">
                            {[txn.gateway, txn.accountNumber].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-admin-muted tabular-nums whitespace-nowrap">
                        {formatDate(txn.transactionDate || txn.createdAt, true)}
                      </td>

                      <td className="py-4 px-4 font-black text-sm text-brand-green tabular-nums whitespace-nowrap">
                        {formatVND(txn.amount)}
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-mono text-xs text-brand-green bg-admin-bg border border-admin-border rounded-lg px-2.5 py-1.5 break-words">
                          {txn.content || '(Không có nội dung)'}
                        </p>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {txn.resolvedOrderId && (
                          <Link
                            href={`/orders/${txn.resolvedOrderId}`}
                            className="block text-[11px] text-brand-green-light hover:underline mt-1 font-mono"
                          >
                            Đơn #{String(txn.resolvedOrderId).slice(-8).toUpperCase()}
                          </Link>
                        )}
                        {txn.resolvedNote && (
                          <p className="text-[11px] text-admin-muted mt-0.5 max-w-[180px] truncate" title={txn.resolvedNote}>
                            {txn.resolvedNote}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right min-w-[290px]">
                        {txn.resolutionStatus === 'OPEN' ? (
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1.5">
                              {candidateOrders.length > 0 && (
                                <select
                                  value={
                                    candidateOrders.some((o) => String(o._id) === orderInputMap[txn._id])
                                      ? orderInputMap[txn._id]
                                      : ''
                                  }
                                  onChange={(e) =>
                                    setOrderInputMap((prev) => ({
                                      ...prev,
                                      [txn._id]: e.target.value,
                                    }))
                                  }
                                  disabled={isBusy}
                                  className="w-full px-2.5 py-1.5 bg-admin-bg border border-admin-border rounded-lg text-[11px] font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                                >
                                  <option value="">-- Chọn nhanh đơn bank gần đây --</option>
                                  {candidateOrders.map((o) => (
                                    <option key={o._id} value={o._id}>
                                      {o.orderCode || `DH${String(o._id).slice(-8).toUpperCase()}`} •{' '}
                                      {o.shippingAddress?.fullName || 'Khách'} • {formatVND(o.total)} (
                                      {getPaymentStatus(o.paymentStatus).label})
                                    </option>
                                  ))}
                                </select>
                              )}

                              <input
                                type="text"
                                placeholder="Hoặc nhập Order ID (24 ký tự) / mã DH..."
                                value={orderInputMap[txn._id] || ''}
                                onChange={(e) =>
                                  setOrderInputMap((prev) => ({
                                    ...prev,
                                    [txn._id]: e.target.value,
                                  }))
                                }
                                disabled={isBusy}
                                className="w-full px-2.5 py-1.5 bg-admin-bg border border-admin-border rounded-lg text-[11px] font-mono text-brand-green placeholder:text-admin-muted placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-brand-green"
                              />

                              <input
                                type="text"
                                placeholder="Ghi chú đối soát (tùy chọn)"
                                value={noteInputMap[txn._id] || ''}
                                onChange={(e) =>
                                  setNoteInputMap((prev) => ({
                                    ...prev,
                                    [txn._id]: e.target.value,
                                  }))
                                }
                                disabled={isBusy}
                                className="w-full px-2.5 py-1.5 bg-admin-bg border border-admin-border rounded-lg text-[11px] text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReconcile(txn, 'match_order')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-dark text-white text-[11px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <Link2 className="w-3 h-3 shrink-0" />
                                Khớp đơn
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReconcile(txn, 'mark_refunded')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 shrink-0" />
                                Hoàn tiền
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReconcile(txn, 'ignore')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <Ban className="w-3 h-3 shrink-0" />
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-admin-muted">
                            {txn.resolvedAt ? `Xử lý lúc ${formatDate(txn.resolvedAt, true)}` : 'Đã xử lý'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-admin-muted">
                    <Inbox className="w-7 h-7 mx-auto mb-2 text-admin-muted/60" />
                    Không có giao dịch chưa khớp nào trong mục này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {unmatchedTotalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-soft flex items-center justify-between text-xs text-admin-muted">
            <span className="tabular-nums">
              Trang {unmatchedPage} / {unmatchedTotalPages} • {unmatchedTotal} giao dịch
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={unmatchedPage <= 1}
                onClick={() => setUnmatchedPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft disabled:opacity-40 cursor-pointer"
              >
                ‹ Trước
              </button>
              <button
                type="button"
                disabled={unmatchedPage >= unmatchedTotalPages}
                onClick={() => setUnmatchedPage((p) => Math.min(unmatchedTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft disabled:opacity-40 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Payment Exceptions */}
      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft">
          <h2 className="text-base font-black text-brand-green flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
            Đơn hàng ngoại lệ thanh toán (Chờ hoàn tiền / Thiếu tiền / Chuyển thừa)
          </h2>
          <p className="text-xs text-admin-muted mt-0.5">
            Bao gồm đơn thanh toán một phần, đơn cần hoàn tiền do quá hạn/hết hàng, và đơn khách chuyển dư tiền.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Mã đơn</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Đã nhận / Cần thu</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Chênh lệch</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loadingExceptions ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-admin-muted">
                    Đang tải danh sách đơn ngoại lệ...
                  </td>
                </tr>
              ) : exceptionItems.length > 0 ? (
                exceptionItems.map((item) => {
                  const statusBadge = getPaymentStatus(item.paymentStatus);

                  return (
                    <tr key={item.key} className="hover:bg-admin-surface transition-colors">
                      <td className="py-4 px-6 font-mono font-bold whitespace-nowrap">
                        {item.orderId ? (
                          <Link
                            href={`/orders/${item.orderId}`}
                            className="inline-flex items-center gap-1 hover:underline text-brand-green"
                          >
                            {item.orderCode}
                            <ExternalLink className="w-3 h-3 text-admin-muted" />
                          </Link>
                        ) : (
                          <span>{item.orderCode}</span>
                        )}
                        {item.updatedAt && (
                          <span className="block text-[11px] font-sans font-normal text-admin-muted mt-0.5 tabular-nums">
                            {formatDate(item.updatedAt, true)}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-brand-green">{item.customerName}</p>
                        {item.customerPhone && (
                          <p className="text-[11px] text-admin-muted tabular-nums">
                            {item.customerPhone}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.badge}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 tabular-nums whitespace-nowrap">
                        <span className="font-black text-brand-green">
                          {formatVND(item.paidAmount + item.overpaidAmount)}
                        </span>
                        <span className="text-admin-muted"> / {formatVND(item.expectedAmount)}</span>
                      </td>

                      <td className="py-4 px-4 tabular-nums whitespace-nowrap">
                        {item.paymentStatus === 'need_refund' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                            Cần hoàn {formatVND(item.paidAmount + item.overpaidAmount)}
                          </span>
                        ) : item.overpaidAmount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                            Thừa {formatVND(item.overpaidAmount)}
                          </span>
                        ) : item.paymentStatus === 'partially_paid' && item.remainingAmount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold text-[11px]">
                            Thiếu {formatVND(item.remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-admin-muted">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {item.canRefund && item.orderId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundTarget(item);
                              setRefundNote('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Xác nhận đã hoàn tiền
                          </button>
                        ) : item.paymentStatus === 'partially_paid' ? (
                          <span className="text-[11px] font-semibold text-orange-700">
                            Đang chờ khách chuyển thêm
                          </span>
                        ) : (
                          <span className="text-[11px] text-admin-muted">Đã hoàn tất</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-admin-muted">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-emerald-500/70" />
                    Không có đơn hàng ngoại lệ thanh toán nào cần xử lý.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {exceptionsTotalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-soft flex items-center justify-between text-xs text-admin-muted">
            <span className="tabular-nums">
              Trang {exceptionsPage} / {exceptionsTotalPages} • {exceptionsTotal} đơn ngoại lệ
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={exceptionsPage <= 1}
                onClick={() => setExceptionsPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft disabled:opacity-40 cursor-pointer"
              >
                ‹ Trước
              </button>
              <button
                type="button"
                disabled={exceptionsPage >= exceptionsTotalPages}
                onClick={() => setExceptionsPage((p) => Math.min(exceptionsTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft disabled:opacity-40 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmRefund}
            className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full border border-admin-border shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-green-soft text-brand-green flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-brand-green">
                  Xác nhận đã hoàn tiền
                </h3>
                <p className="text-xs text-admin-muted">
                  Đơn hàng <span className="font-mono font-bold">{refundTarget.orderCode}</span> •{' '}
                  {refundTarget.customerName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-admin-bg border border-admin-border text-xs space-y-1 tabular-nums">
              <div className="flex justify-between">
                <span className="text-admin-muted">Tổng đã nhận từ khách:</span>
                <span className="font-bold text-brand-green">
                  {formatVND(refundTarget.paidAmount + refundTarget.overpaidAmount)}
                </span>
              </div>
              {refundTarget.overpaidAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-admin-muted">Khoản chuyển thừa:</span>
                  <span className="font-bold text-amber-700">
                    {formatVND(refundTarget.overpaidAmount)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="refund-note"
                className="block text-xs font-bold text-brand-green mb-1.5"
              >
                Ghi chú hoàn tiền (tùy chọn)
              </label>
              <textarea
                id="refund-note"
                rows={3}
                maxLength={500}
                placeholder="VD: Đã chuyển hoàn qua STK khách ngày..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="w-full p-3 bg-admin-bg border border-admin-border rounded-xl text-xs text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={refundSubmitting}
                onClick={() => {
                  setRefundTarget(null);
                  setRefundNote('');
                }}
                className="px-4 py-2 rounded-xl border border-admin-border text-xs font-bold text-brand-green hover:bg-admin-soft cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={refundSubmitting}
                className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {refundSubmitting ? 'Đang xử lý...' : 'Xác nhận đã hoàn tiền'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
