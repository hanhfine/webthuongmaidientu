import { z } from 'zod';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const VN_OFFSET = '+07:00';

// Date-only values are whole Vietnam-local days, matching the byDay buckets (Asia/Ho_Chi_Minh).
// Full ISO datetimes are used as given.
function parseBound(value, endOfDay) {
  if (!DATE_ONLY.test(value)) return new Date(value);
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return new Date(NaN);
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${value}T${time}${VN_OFFSET}`);
}

export const revenueQuerySchema = z
  .object({ from: z.string().optional(), to: z.string().optional() })
  .transform(({ from, to }) => {
    const end = to ? parseBound(to, true) : new Date();
    const start = from ? parseBound(from, false) : new Date(end.getTime() - 30 * 86_400_000);
    return { from: start, to: end };
  })
  .refine(({ from, to }) => !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()), {
    message: 'Ngày không hợp lệ',
  })
  .refine(({ from, to }) => Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from <= to, {
    message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
  });
