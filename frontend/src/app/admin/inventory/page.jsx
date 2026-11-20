'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Boxes, 
  Search, 
  ChevronDown, 
  Plus, 
  Minus, 
  Download,
  AlertTriangle
} from 'lucide-react';
import StockLevelBar from '@/components/admin/StockLevelBar';
import { formatVND } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminInventoryPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out
  const [adjustingId, setAdjustingId] = useState(null);

  const loadStock = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/products');
      if (data?.items) {
        setProducts(data.items);
      } else if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      toast.error('Không thể tải dữ liệu tồn kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  // Compute metrics
  const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const belowThreshold = products.filter((p) => p.stock <= 10);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q));

    if (stockFilter === 'low') return matchesSearch && p.stock > 0 && p.stock <= 10;
    if (stockFilter === 'out') return matchesSearch && p.stock <= 0;
    return matchesSearch;
  });

  // Quick stock adjustment (+ Restock or - decrement)
  const handleAdjustStock = async (prod, delta) => {
    const nextStock = Math.max(0, prod.stock + delta);
    try {
      setAdjustingId(prod._id);
      await api.put(`/api/products/${prod._id}`, { stock: nextStock });
      toast.success(`Đã cập nhật tồn kho "${prod.name}" thành ${nextStock}!`);
      loadStock();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật tồn kho');
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Breadcrumb & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
            STOCKROOM
          </span>
          <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
            Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
            Biết chính xác thiết bị nào sẵn sàng giao hàng và thiết bị nào cần nhập thêm.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast.info('Tính năng xuất file bảng kiểm kê (CSV/Excel)')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#e1e6e0] text-[#1c3f30] text-xs font-bold hover:bg-[#edf2ee] transition-all shadow-sm w-fit"
        >
          <Download className="w-4 h-4 text-[#5d7367]" />
          <span>Download stock sheet</span>
        </button>
      </div>

      {/* 2. Forest Green Hero Banner (Tandem Inventory Style) */}
      <div className="rounded-3xl p-8 bg-[#1c3f30] text-white shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div>
          <span className="text-[11px] font-semibold text-[#84a98c] uppercase tracking-wider block mb-1">
            ON HAND RIGHT NOW
          </span>
          <p className="text-3xl sm:text-4xl font-black text-white">
            {totalUnits} <span className="text-lg font-normal text-[#c8dec9]">units</span>
          </p>
          <p className="text-xs text-[#84a98c] mt-0.5">
            Across {products.length} catalog listings
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#84a98c] uppercase tracking-wider block mb-1">
            CATALOG VALUE
          </span>
          <p className="text-2xl sm:text-3xl font-black text-white truncate">
            {formatVND(totalValue)}
          </p>
          <p className="text-xs text-[#84a98c] mt-0.5">
            Using current listing prices
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#142e23] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Below stock point</p>
              <p className="text-xs text-amber-300 font-semibold">{belowThreshold.length} listings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
            className="text-xs font-bold text-amber-300 hover:underline"
          >
            {stockFilter === 'low' ? 'Tất cả' : 'Lọc ngay >'}
          </button>
        </div>
      </div>

      {/* 3. Stock by Listing Table Card */}
      <div className="rounded-3xl bg-white border border-[#e1e6e0] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 sm:p-6 border-b border-[#edf2ee] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#788e81] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find a product or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f4f6f3] border-none rounded-full text-xs font-semibold text-[#1c3f30] placeholder-[#788e81] focus:ring-2 focus:ring-[#1c3f30]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-[#f4f6f3] rounded-full text-xs font-bold text-[#1c3f30] border-none cursor-pointer focus:ring-2 focus:ring-[#1c3f30]"
              >
                <option value="all">Tất cả kho ({products.length})</option>
                <option value="low">Cần nhập sớm (&le; 10)</option>
                <option value="out">Đã hết hàng (0)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#788e81] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1c3f30]">
            <thead className="bg-[#f8faf8] border-b border-[#edf2ee] text-[11px] font-bold text-[#6e8578] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Listing</th>
                <th className="py-3.5 px-4">Available</th>
                <th className="py-3.5 px-6">Stock level</th>
                <th className="py-3.5 px-4">Low-stock point</th>
                <th className="py-3.5 px-6 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Đang kiểm kê số liệu kho hàng...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isAdjusting = adjustingId === prod._id;
                  const isLow = prod.stock > 0 && prod.stock <= 10;
                  const isOut = prod.stock <= 0;
                  const imgUrl = prod.imageId
                    ? `/api/images/${prod.imageId}`
                    : 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200&q=80';

                  return (
                    <tr key={prod._id} className="hover:bg-[#f8faf8] transition-colors">
                      {/* Product details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-[#f4f6f3] p-1.5 shrink-0 overflow-hidden border border-[#e1e6e0]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <p className="font-bold text-[#1c3f30] text-sm line-clamp-1">{prod.name}</p>
                            <p className="text-[11px] text-[#788e81] font-mono mt-0.5">
                              {prod.brand} • SKU-{prod._id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Available Count */}
                      <td className="py-4 px-4">
                        <span className="font-black text-base text-[#1c3f30] block">
                          {prod.stock}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-[#2d6a4f]'
                        }`}>
                          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                        </span>
                      </td>

                      {/* Visual Stock Level Bar */}
                      <td className="py-4 px-6">
                        <StockLevelBar stock={prod.stock} threshold={10} />
                      </td>

                      {/* Threshold point */}
                      <td className="py-4 px-4 font-semibold text-neutral-500">
                        10 units
                      </td>

                      {/* Quick Adjust Buttons (+ Restock / -) */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isAdjusting}
                            onClick={() => handleAdjustStock(prod, 10)}
                            className="px-3 py-1.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            title="Nhập thêm 10 thiết bị vào kho"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restock</span>
                          </button>

                          <button
                            type="button"
                            disabled={isAdjusting || prod.stock <= 0}
                            onClick={() => handleAdjustStock(prod, -1)}
                            className="w-8 h-8 rounded-full border border-[#e1e6e0] hover:bg-[#edf2ee] text-[#1c3f30] font-bold flex items-center justify-center transition-colors disabled:opacity-30"
                            title="Xuất giảm 1 đơn vị"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Không có sản phẩm nào thỏa mãn điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
