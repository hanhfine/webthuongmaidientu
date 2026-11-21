/**
 * Format a number into VND currency string
 * e.g. 41990000 -> "41.990.000 ₫"
 */
export function formatVND(amount) {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (amount === '' || amount === null || amount === undefined || typeof amount === 'boolean' || !Number.isFinite(num)) {
    return '0\u00a0₫';
  }
  const safe = Object.is(num, -0) ? 0 : num;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(safe);
}

/**
 * Format date string to Vietnamese localized format
 */
export function formatDate(dateString, includeTime = false) {
  if (dateString === null || dateString === undefined || dateString === '') return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

/**
 * Order status configuration for labels, badges, and progress tracking
 */
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Chờ xác nhận',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
    dot: 'bg-amber-500',
    step: 1,
  },
  confirmed: {
    label: 'Đã xác nhận & Đang đóng gói',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
    dot: 'bg-blue-500',
    step: 2,
  },
  shipping: {
    label: 'Đang vận chuyển',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400',
    dot: 'bg-indigo-500',
    step: 3,
  },
  delivered: {
    label: 'Giao hàng thành công',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    step: 4,
  },
  cancelled: {
    label: 'Đã hủy',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400',
    dot: 'bg-rose-500',
    step: -1,
  },
};

export function getOrderStatus(status) {
  return ORDER_STATUS_CONFIG[status] || {
    label: status || 'Không xác định',
    badge: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    dot: 'bg-neutral-400',
    step: 0,
  };
}

/**
 * Payment status configuration
 */
export const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Chưa thanh toán',
    badge: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  },
  pending: {
    label: 'Chờ duyệt thanh toán',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  paid: {
    label: 'Đã thanh toán',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export function getPaymentStatus(status) {
  return PAYMENT_STATUS_CONFIG[status] || {
    label: status || 'Chưa rõ',
    badge: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  };
}

/**
 * Payment method label
 */
export function getPaymentMethodLabel(method) {
  switch (method) {
    case 'cod':
      return 'Thanh toán khi nhận hàng (COD)';
    case 'bank':
      return 'Chuyển khoản ngân hàng (VietQR)';
    default:
      return method || 'Chưa xác định';
  }
}
