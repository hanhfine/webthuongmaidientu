'use client';

import { useState, useEffect } from 'react';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

function toVnDateStr(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getVnDayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return dayNames[dt.getUTCDay()];
}

function shiftDateStr(baseStr, offsetDays) {
  const [y, m, d] = baseStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatShortVal(val) {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}Tr`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return String(val);
}

export default function SalesBarChart({ refreshKey = 0 }) {
  const [timeRange, setTimeRange] = useState('7d'); // '7d' or '4w'
  const [chartData, setChartData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const toStr = toVnDateStr(new Date());
      const days = timeRange === '7d' ? 7 : 28;
      const fromStr = shiftDateStr(toStr, -(days - 1));

      try {
        setLoading(true);
        const res = await api.get(`/api/admin/stats/revenue?from=${fromStr}&to=${toStr}`);

        const revenueMap = new Map();
        const daysArray = Array.isArray(res) ? res : (res?.byDay || []);
        let sum = typeof res?.revenue === 'number' ? res.revenue : 0;

        daysArray.forEach((r) => {
          revenueMap.set(r.date, r.revenue || 0);
          if (typeof res?.revenue !== 'number') {
            sum += r.revenue || 0;
          }
        });
        setTotalRevenue(sum);

        const points = [];
        if (timeRange === '7d') {
          for (let i = 0; i < 7; i++) {
            const dateKey = shiftDateStr(fromStr, i);
            points.push({
              date: dateKey,
              dayLabel: getVnDayLabel(dateKey),
              value: revenueMap.get(dateKey) || 0,
            });
          }
        } else {
          // 28 days grouped into 14 2-day buckets so no day (including today) is skipped
          for (let i = 0; i < 14; i++) {
            const d1 = shiftDateStr(fromStr, i * 2);
            const d2 = shiftDateStr(fromStr, i * 2 + 1);
            const val = (revenueMap.get(d1) || 0) + (revenueMap.get(d2) || 0);
            const [, mm, dd] = d2.split('-');
            points.push({
              date: `${d1}..${d2}`,
              dayLabel: `${dd}/${mm}`,
              value: val,
            });
          }
        }

        setChartData(points);
      } catch {
        const emptyPoints = [];
        const bucketCount = timeRange === '7d' ? 7 : 14;
        for (let i = 0; i < bucketCount; i++) {
          const dKey = shiftDateStr(fromStr, timeRange === '7d' ? i : i * 2 + 1);
          const [, mm, dd] = dKey.split('-');
          emptyPoints.push({
            date: dKey,
            dayLabel: timeRange === '7d' ? getVnDayLabel(dKey) : `${dd}/${mm}`,
            value: 0,
          });
        }
        setChartData(emptyPoints);
        setTotalRevenue(0);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [timeRange, refreshKey]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="p-6 sm:p-7 rounded-2xl bg-white border border-admin-border flex flex-col justify-between">
      {/* Header & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h3 className="text-sm font-bold text-brand-green">
            Doanh thu theo thời gian
          </h3>
          <p className="text-xs text-admin-muted mt-0.5">
            Doanh thu từ các đơn hàng đã giao & thu tiền ({timeRange === '7d' ? '7 ngày qua' : '28 ngày qua'})
          </p>
        </div>

        <div className="flex items-center rounded-full bg-admin-soft p-1 border border-admin-border-soft">
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              timeRange === '7d'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-admin-muted hover:text-brand-green'
            }`}
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('4w')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              timeRange === '4w'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-admin-muted hover:text-brand-green'
            }`}
          >
            4 tuần
          </button>
        </div>
      </div>

      {/* Total Stat */}
      <div className="py-2 tabular-nums">
        <span className="text-2xl sm:text-3xl font-black text-brand-green whitespace-nowrap">
          {formatVND(totalRevenue)}
        </span>
        <span className="text-xs font-semibold text-admin-muted ml-2 whitespace-nowrap">
          ↗ Doanh thu ghi nhận
        </span>
      </div>

      {/* Vertical Bar Chart */}
      <div className="h-44 pt-6 flex items-end justify-between gap-1.5 sm:gap-2 border-b border-admin-soft pb-2">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-admin-muted">
            Đang tải biểu đồ...
          </div>
        ) : (
          chartData.map((item, idx) => {
            const heightPct = item.value > 0 ? Math.max(12, Math.round((item.value / maxValue) * 100)) : 6;
            const isHighest = item.value === maxValue && item.value > 0;

            return (
              <div key={idx} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group" title={`${item.date}: ${formatVND(item.value)}`}>
                {item.value > 0 && (
                  <span className="text-xs font-bold text-brand-green mb-1 tabular-nums whitespace-nowrap">
                    {formatShortVal(item.value)}
                  </span>
                )}

                <div
                  className={`w-full max-w-[32px] rounded-t-lg transition-colors ${
                    isHighest
                      ? 'bg-brand-green'
                      : item.value > 0
                      ? 'bg-admin-bar hover:bg-brand-green'
                      : 'bg-admin-bar-empty'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                <span className="text-xs font-semibold text-admin-muted mt-2 tabular-nums truncate max-w-full">
                  {item.dayLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
