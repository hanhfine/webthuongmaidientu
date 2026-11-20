'use client';

import { useState, useEffect } from 'react';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

export default function SalesBarChart({ refreshKey = 0 }) {
  const [timeRange, setTimeRange] = useState('7d'); // '7d' or '4w'
  const [chartData, setChartData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        // Calculate date range in YYYY-MM-DD
        const now = new Date();
        const days = timeRange === '7d' ? 7 : 28;
        const past = new Date();
        past.setDate(now.getDate() - (days - 1));

        const toStr = now.toISOString().split('T')[0];
        const fromStr = past.toISOString().split('T')[0];

        const res = await api.get(`/api/admin/stats/revenue?from=${fromStr}&to=${toStr}`);
        
        // Map response items to day buckets ({ revenue, orderCount, byDay })
        const revenueMap = new Map();
        const daysArray = Array.isArray(res) ? res : (res?.byDay || []);
        let sum = typeof res?.revenue === 'number' ? res.revenue : 0;

        daysArray.forEach((r) => {
          revenueMap.set(r.date, r.revenue);
          if (typeof res?.revenue !== 'number') {
            sum += (r.revenue || 0);
          }
        });
        setTotalRevenue(sum);

        // Generate day points
        const points = [];
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        for (let i = 0; i < (timeRange === '7d' ? 7 : 14); i++) {
          const d = new Date(past);
          d.setDate(past.getDate() + (timeRange === '7d' ? i : i * 2));
          const dateKey = d.toISOString().split('T')[0];
          const val = revenueMap.get(dateKey) || 0;
          points.push({
            date: dateKey,
            dayLabel: dayNames[d.getDay()],
            value: val,
          });
        }

        setChartData(points);
      } catch (err) {
        // Show 0 revenue gracefully when no delivered orders exist yet
        const now = new Date();
        const days = timeRange === '7d' ? 7 : 14;
        const past = new Date();
        past.setDate(now.getDate() - (days - 1));
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const emptyPoints = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(past);
          d.setDate(past.getDate() + i);
          emptyPoints.push({
            date: d.toISOString().split('T')[0],
            dayLabel: dayNames[d.getDay()],
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

  // Find max value to normalize bar heights
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#e1e6e0] shadow-sm flex flex-col justify-between">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="text-sm font-bold text-[#1c3f30]">
            Sales at a glance
          </h3>
          <p className="text-xs text-[#6e8578] mt-0.5">
            Doanh thu từ các đơn hàng đã giao thành công gần đây
          </p>
        </div>

        {/* 7 days / 4 weeks Pill Toggle */}
        <div className="flex items-center rounded-full bg-[#edf2ee] p-1 border border-[#d9e2db]">
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              timeRange === '7d'
                ? 'bg-white text-[#1c3f30] shadow-sm'
                : 'text-[#6e8578] hover:text-[#1c3f30]'
            }`}
          >
            7 ngày
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('4w')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              timeRange === '4w'
                ? 'bg-white text-[#1c3f30] shadow-sm'
                : 'text-[#6e8578] hover:text-[#1c3f30]'
            }`}
          >
            4 tuần
          </button>
        </div>
      </div>

      {/* Total Stat */}
      <div className="py-2">
        <span className="text-2xl sm:text-3xl font-black text-[#1c3f30]">
          {formatVND(totalRevenue)}
        </span>
        <span className="text-xs font-semibold text-[#6e8578] ml-2">
          ↗ Doanh thu ghi nhận
        </span>
      </div>

      {/* Minimalist Vertical Bar Chart */}
      <div className="h-44 pt-6 flex items-end justify-between gap-2 border-b border-[#edf2ee] pb-2">
        {chartData.map((item, idx) => {
          const heightPct = item.value > 0 ? Math.max(12, Math.round((item.value / maxValue) * 100)) : 6;
          const isHighest = item.value === maxValue && item.value > 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              {/* Tooltip value */}
              {item.value > 0 && (
                <span className="text-[10px] font-bold text-[#1c3f30] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {Math.round(item.value / 1000000)}Tr
                </span>
              )}

              {/* Bar */}
              <div
                className={`w-full max-w-[32px] rounded-t-xl transition-all duration-500 ${
                  isHighest
                    ? 'bg-[#1c3f30]'
                    : item.value > 0
                    ? 'bg-[#84a98c] hover:bg-[#52796f]'
                    : 'bg-[#e5ede7]'
                }`}
                style={{ height: `${heightPct}%` }}
              />

              {/* Day Label */}
              <span className="text-[11px] font-semibold text-[#6e8578] mt-2">
                {item.dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
