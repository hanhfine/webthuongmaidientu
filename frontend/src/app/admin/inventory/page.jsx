'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  Download,
  AlertTriangle,
} from 'lucide-react';
import StockLevelBar from '@/components/admin/StockLevelBar';
import { formatVND } from '@/lib/format';
import { resolveProductImage } from '@/lib/productImage';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminInventoryPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out
  const [adjustingId, setAdjustingId] = useState(null);
  const [customStockMap, setCustomStockMap] = useState({});

  const loadStock = useCallback(async (targetPage = page, q = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api.get(`/api/admin/products?${params.toString()}`);
      if (data?.items) {
        setProducts(data.items);
        setTotal(data.total ?? data.items.length);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setTotal(data.length);
      }
    } catch {
      toast.error('Không thể tải dữ liệu tồn kho');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadStock(page, searchQuery);
    }, 150);
    return () => clearTimeout(t);
  }, [page, searchQuery, loadStock]);

  const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const lowThresholdList = products.filter((p) => p.stock > 0 && p.stock <= 10);
  const outCount = products.filter((p) => p.stock <= 0).length;

  const filteredProducts = products.filter((p) => {
    if (stockFilter === 'low') return p.stock > 0 && p.stock <= 10;
    if (stockFilter === 'out') return p.stock <= 0;
    return true;
  });

  const handleSetStock = async (prod, nextStock) => {
    const safeStock = Math.max(0, Math.floor(Number(nextStock)));
    if (!Number.isFinite(safeStock)) return;
    try {
      setAdjustingId(prod._id);
      await api.put(`/api/products/${prod._id}`, { stock: safeStock });
      toast.success(`Đã cập nhật tồn kho "${prod.name}" thành ${safeStock}!`);
      setCustomStockMap((prev) => {
        const copy = { ...prev };
        delete copy[prod._id];
        return copy;
      });
      loadStock(page, searchQuery);
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật tồn kho');
    } finally {
      setAdjustingId(null);
    }
  };

  const handleExportCsv = () => {
    const header = ['SKU', 'Name', 'Brand', 'Price', 'Stock', 'Active'].join(',');
    const rows = filteredProducts.map((p) =>
      [
        `SKU-${p._id.slice(-6).toUpperCase()}`,
        `"${String(p.name || '').replace(/"/g, '""')}"`,
        `"${String(p.brand || '').replace(/"/g, '""')}"`,
        p.price || 0,
        p.stock || 0,
        p.isActive ? 'true' : 'false',
      ].join(',')
    );
    const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV kiểm kê kho!');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
            KHO HÀNG
          </span>
          <h1 className="text-3xl font-black text-brand-green tracking-tight">
            Quản lý tồn kho
          </h1>
          <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
            Biết chính xác thiết bị nào sẵn sàng giao hàng và thiết bị nào cần nhập thêm.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-admin-border text-brand-green text-xs font-bold hover:bg-admin-soft transition-colors w-fit whitespace-nowrap cursor-pointer"
        >
          <Download className="w-4 h-4 text-admin-muted shrink-0" />
          <span>Xuất bảng kiểm kê (CSV)</span>
        </button>
      </div>

      <div className="rounded-2xl p-7 sm:p-8 bg-brand-green text-white grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div>
          <span className="text-xs font-semibold text-admin-muted-dark uppercase tracking-wider block mb-1">
            TỒN KHO HIỆN CÓ (TRANG NÀY)
          </span>
          <p className="text-3xl sm:text-4xl font-black text-white tabular-nums whitespace-nowrap">
            {totalUnits} <span className="text-lg font-normal text-admin-tint">sản phẩm</span>
          </p>
          <p className="text-xs text-admin-muted-dark mt-0.5 tabular-nums">
            {products.length} / {total} mặt hàng
          </p>
        </div>

        <div className="min-w-0">
          <span className="text-xs font-semibold text-admin-muted-dark uppercase tracking-wider block mb-1">
            GIÁ TRỊ HÀNG TỒN
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white truncate tabular-nums whitespace-nowrap">
            {formatVND(totalValue)}
          </p>
          <p className="text-xs text-admin-muted-dark mt-0.5">
            Theo giá bán niêm yết
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-brand-green-dark border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Sắp hết / Hết hàng</p>
              <p className="text-xs text-amber-300 font-semibold tabular-nums">
                {lowThresholdList.length} sắp hết • {outCount} hết hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
            className="py-2 px-2.5 -mr-2.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-white/10 hover:underline whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {stockFilter === 'low' ? 'Tất cả' : 'Lọc sắp hết >'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-admin-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm sản phẩm hoặc hãng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="relative">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-bold text-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="all">Tất cả kho ({products.length})</option>
              <option value="low">Sắp hết (1–10) ({lowThresholdList.length})</option>
              <option value="out">Đã hết hàng (0) ({outCount})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-admin-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Sản phẩm</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tồn kho</th>
                <th className="py-3.5 px-6 whitespace-nowrap">Mức tồn</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngưỡng cảnh báo</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Đang kiểm kê số liệu kho hàng...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isAdjusting = adjustingId === prod._id;
                  const isLow = prod.stock > 0 && prod.stock <= 10;
                  const isOut = prod.stock <= 0;
                  const imgUrl = resolveProductImage(prod);
                  const customVal = customStockMap[prod._id] ?? String(prod.stock);

                  return (
                    <tr key={prod._id} className="hover:bg-admin-surface transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-admin-bg p-1.5 shrink-0 overflow-hidden border border-admin-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-brand-green text-sm line-clamp-1">{prod.name}</p>
                            <p className="text-xs text-admin-muted font-mono mt-0.5">
                              {prod.brand} • SKU-{prod._id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 tabular-nums whitespace-nowrap">
                        <span className="font-black text-base text-brand-green block">
                          {prod.stock}
                        </span>
                        <span className={`text-xs font-bold whitespace-nowrap ${
                          isOut ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-brand-green-light'
                        }`}>
                          {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Còn hàng'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <StockLevelBar stock={prod.stock} threshold={10} />
                      </td>

                      <td className="py-4 px-4 font-semibold text-admin-muted tabular-nums whitespace-nowrap">
                        10 sản phẩm
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            value={customVal}
                            onChange={(e) =>
                              setCustomStockMap((prev) => ({ ...prev, [prod._id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSetStock(prod, customVal);
                            }}
                            className="w-16 px-2 py-1.5 bg-admin-bg border border-admin-border rounded-lg text-xs font-bold text-center tabular-nums"
                            aria-label={`Số lượng tồn kho cho ${prod.name}`}
                          />
                          {customStockMap[prod._id] !== undefined && Number(customVal) !== prod.stock && (
                            <button
                              type="button"
                              disabled={isAdjusting}
                              onClick={() => handleSetStock(prod, customVal)}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-green-light text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                            >
                              Lưu
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isAdjusting}
                            onClick={() => handleSetStock(prod, prod.stock + 10)}
                            className="px-3 h-8 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors flex items-center justify-center whitespace-nowrap tabular-nums cursor-pointer shrink-0"
                            title="Nhập thêm 10 thiết bị vào kho"
                            aria-label={`Nhập thêm 10 cho ${prod.name}`}
                          >
                            +10
                          </button>

                          <button
                            type="button"
                            disabled={isAdjusting || prod.stock <= 0}
                            onClick={() => handleSetStock(prod, prod.stock - 1)}
                            className="px-2.5 h-8 rounded-xl border border-admin-border hover:bg-admin-soft text-brand-green text-xs font-bold tabular-nums flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer shrink-0"
                            title="Xuất giảm 1 đơn vị"
                            aria-label={`Giảm 1 tồn kho ${prod.name}`}
                          >
                            -1
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Không có sản phẩm nào thỏa mãn điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-soft flex flex-wrap items-center justify-between gap-3 text-xs text-admin-muted">
            <span className="tabular-nums">
              Trang {page} / {totalPages} • Tổng {total} sản phẩm
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 min-h-8 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
              >
                ‹ Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 min-h-8 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
