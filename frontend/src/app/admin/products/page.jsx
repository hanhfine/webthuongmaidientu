'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  ChevronDown,
  Eye,
  Edit3,
  Trash2,
  Upload,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { resolveProductImage } from '@/lib/productImage';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

const DEFAULT_SPECS = { 'Màn hình': '', 'Vi xử lý': '', RAM: '', Pin: '' };

function AdminProductsContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Samsung',
    categoryId: '',
    price: '',
    stock: '',
    description: '',
    specs: { ...DEFAULT_SPECS },
    imageId: null,
    image: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncingFakeStore, setSyncingFakeStore] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadCatalog = useCallback(async (targetPage = page, q = searchQuery, sort = sortBy) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
        sort,
      });
      if (q.trim()) params.set('q', q.trim());

      const [prodRes, catRes] = await Promise.all([
        api.get(`/api/admin/products?${params.toString()}`),
        api.get('/api/admin/categories').catch(() => []),
      ]);

      if (prodRes?.items) {
        setProducts(prodRes.items);
        setTotal(prodRes.total ?? prodRes.items.length);
      } else if (Array.isArray(prodRes)) {
        setProducts(prodRes);
        setTotal(prodRes.length);
      }

      if (Array.isArray(catRes)) {
        setCategories(catRes);
      }
    } catch {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sortBy, toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCatalog(page, searchQuery, sortBy);
    }, 150);
    return () => clearTimeout(t);
  }, [page, searchQuery, sortBy, loadCatalog]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive !== false),
    [categories]
  );
  const openedNewRef = useRef(false);

  const handleOpenCreate = useCallback(() => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'Samsung',
      categoryId: activeCategories[0]?._id || categories[0]?._id || '',
      price: '',
      stock: '',
      description: '',
      specs: { ...DEFAULT_SPECS },
      imageId: null,
      image: '',
    });
    setImageFile(null);
    setImagePreview('');
    setModalError('');
    setIsModalOpen(true);
  }, [activeCategories, categories]);

  const handleSyncFakeStore = async () => {
    try {
      setSyncingFakeStore(true);
      const res = await api.post('/api/admin/products/sync-fakestore', {});
      toast.success(
        `Đã đồng bộ ${res?.syncedCount || 44} sản phẩm công nghệ (Fake Store API & DummyJSON)!`,
      );
      loadCatalog(1, searchQuery, sortBy);
      setPage(1);
    } catch (err) {
      toast.error(err.message || 'Không thể đồng bộ từ API');
    } finally {
      setSyncingFakeStore(false);
    }
  };

  useEffect(() => {
    if (!openedNewRef.current && searchParams.get('new') === '1' && categories.length > 0) {
      openedNewRef.current = true;
      handleOpenCreate();
    }
  }, [searchParams, categories.length, handleOpenCreate]);

  const allListingsCount = total;
  const activeNowCount = products.filter((p) => p.isActive).length;
  const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const stockAlertsCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'active') return p.isActive;
    if (statusFilter === 'hidden') return !p.isActive;
    return true;
  });

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      brand: prod.brand || 'Samsung',
      categoryId: prod.categoryId || activeCategories[0]?._id || '',
      price: String(prod.price),
      stock: String(prod.stock),
      description: prod.description || '',
      specs: { ...DEFAULT_SPECS, ...(prod.specs || {}) },
      imageId: prod.imageId || null,
      image: prod.image || '',
    });
    setImageFile(null);
    setImagePreview(prod.imageId ? `/api/images/${prod.imageId}` : prod.image || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (prod) => {
    try {
      if (prod.isActive) {
        await api.delete(`/api/products/${prod._id}`);
        toast.info(`Đã ẩn sản phẩm "${prod.name}"`);
      } else {
        await api.put(`/api/products/${prod._id}`, { isActive: true });
        toast.success(`Đã hiển thị lại sản phẩm "${prod.name}"`);
      }
      loadCatalog(page, searchQuery, sortBy);
    } catch (err) {
      toast.error(err.message || 'Thao tác không thành công');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim()) {
      setModalError('Tên sản phẩm không được để trống');
      return;
    }
    if (!formData.categoryId) {
      setModalError('Vui lòng chọn danh mục sản phẩm');
      return;
    }
    const priceNum = parseInt(formData.price, 10);
    const stockNum = parseInt(formData.stock, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      setModalError('Giá sản phẩm phải là số nguyên dương VND');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setModalError('Tồn kho phải là số nguyên không âm');
      return;
    }

    try {
      setSaving(true);
      let finalImageId = formData.imageId;

      if (imageFile) {
        const imgForm = new FormData();
        imgForm.append('file', imageFile);
        const uploadRes = await api.post('/api/images', imgForm);
        finalImageId = uploadRes.id || uploadRes._id;
      }

      const cleanSpecs = {};
      Object.entries(formData.specs || {}).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) cleanSpecs[k] = v.trim();
      });

      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        categoryId: formData.categoryId,
        price: priceNum,
        stock: stockNum,
        description: formData.description.trim(),
        specs: cleanSpecs,
        imageId: finalImageId || undefined,
        image: formData.image?.trim() ? formData.image.trim() : null,
      };

      if (editingProduct) {
        await api.put(`/api/products/${editingProduct._id}`, payload);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/api/products', payload);
        toast.success('Thêm sản phẩm mới thành công!');
      }

      setIsModalOpen(false);
      loadCatalog(page, searchQuery, sortBy);
    } catch (err) {
      const detail = err.fieldErrors
        ? Object.entries(err.fieldErrors)
            .map(([k, msgs]) => `${k}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' • ')
        : '';
      setModalError(detail ? `${err.message} (${detail})` : err.message || 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
            DANH MỤC SẢN PHẨM
          </span>
          <h1 className="text-3xl font-black text-brand-green tracking-tight">
            Sản phẩm
          </h1>
          <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
            Quản lý toàn bộ danh sách sản phẩm hiển thị trên cửa hàng của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncFakeStore}
            disabled={syncingFakeStore}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-green/25 bg-white hover:bg-admin-soft text-brand-green text-xs font-bold transition-colors w-fit whitespace-nowrap cursor-pointer disabled:opacity-50"
            title="Lấy danh sách sản phẩm công nghệ từ Fake Store API & DummyJSON"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${syncingFakeStore ? 'animate-spin' : ''}`} />
            <span>{syncingFakeStore ? 'Đang đồng bộ API...' : 'Đồng bộ Fake Store & DummyJSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors w-fit whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Tổng sản phẩm</p>
          <p className="text-2xl font-black text-brand-green mt-1 tabular-nums">{allListingsCount}</p>
          <p className="text-xs text-admin-muted mt-0.5">Toàn bộ danh mục</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Đang hiển thị (trang này)</p>
          <p className="text-2xl font-black text-brand-green-light mt-1 tabular-nums">{activeNowCount}</p>
          <p className="text-xs text-brand-green-light mt-0.5">Khách hàng có thể đặt mua</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border min-w-0">
          <p className="text-xs font-semibold text-admin-muted">Giá trị tồn trang này</p>
          <p className="text-xl sm:text-2xl font-black text-brand-green mt-1 truncate tabular-nums whitespace-nowrap">
            {formatVND(totalStockValue)}
          </p>
          <p className="text-xs text-admin-muted mt-0.5">Theo giá niêm yết</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Sắp hết hàng</p>
          <p className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{stockAlertsCount}</p>
          <p className="text-xs text-amber-700 mt-0.5">Cần nhập thêm (1–10 máy)</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-admin-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc hãng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-bold text-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hiển thị</option>
                <option value="hidden">Đã ẩn</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-admin-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3.5 pr-8 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-bold text-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-admin-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Sản phẩm</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Giá bán</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tồn kho</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Đang tải danh mục sản phẩm...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock > 0 && prod.stock <= 10;
                  const isOut = prod.stock <= 0;
                  const imgUrl = resolveProductImage(prod);

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

                      <td className="py-4 px-4 font-black text-sm tabular-nums whitespace-nowrap">
                        {formatVND(prod.price)}
                      </td>

                      <td className="py-4 px-4 tabular-nums whitespace-nowrap">
                        <span className="font-bold text-sm block">{prod.stock}</span>
                        <span className={`text-xs font-semibold whitespace-nowrap ${
                          isOut ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-brand-green-light'
                        }`}>
                          {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Còn hàng'}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ring-1 ring-inset ring-black/5 ${
                          prod.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          <span className="size-1.5 rounded-full bg-current" />
                          {prod.isActive ? 'Đang bán' : 'Đã ẩn'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1 shrink-0">
                          {prod.isActive && (
                            <Link
                              href={`/products/${prod.slug || prod._id}`}
                              target="_blank"
                              className="p-2 rounded-lg text-admin-muted hover:text-brand-green hover:bg-admin-soft transition-colors cursor-pointer"
                              title="Xem trên trang khách"
                              aria-label={`Xem ${prod.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(prod)}
                            className="p-2 rounded-lg text-admin-muted hover:text-brand-green hover:bg-admin-soft transition-colors cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                            aria-label={`Sửa ${prod.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(prod)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              prod.isActive
                                ? 'text-admin-muted hover:text-rose-700 hover:bg-rose-500/10'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={prod.isActive ? 'Ẩn sản phẩm' : 'Hiển thị lại'}
                            aria-label={prod.isActive ? `Ẩn ${prod.name}` : `Hiển thị ${prod.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Không tìm thấy sản phẩm nào phù hợp.
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

      {/* Create / Edit Modal (No accidental backdrop close on form modals per I20) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full border border-admin-border shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-admin-soft">
              <h3 className="text-lg font-black text-brand-green">
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-admin-muted hover:text-brand-green cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label htmlFor="prod-name" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                  Tên sản phẩm <span className="text-red-600">*</span>
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  placeholder="Galaxy S24 Ultra 256GB"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-brand" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Hãng (Brand) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="prod-brand"
                    type="text"
                    required
                    placeholder="Samsung"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label htmlFor="prod-cat" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Danh mục <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="prod-cat"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.isActive === false ? ' (Đã ẩn)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-price" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Giá bán (VND) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    min="1"
                    required
                    placeholder="25990000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label htmlFor="prod-stock" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Số lượng tồn kho <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    required
                    placeholder="20"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div>
                <span className="block font-bold text-brand-green mb-1">Thông số kỹ thuật (tùy chọn)</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(DEFAULT_SPECS).map((key) => (
                    <input
                      key={key}
                      type="text"
                      placeholder={key}
                      value={formData.specs?.[key] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specs: { ...formData.specs, [key]: e.target.value },
                        })
                      }
                      className="px-3 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs text-brand-green"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block font-bold text-brand-green mb-1">Ảnh sản phẩm (Tải tệp lên hoặc dán URL ảnh từ API)</span>
                <div className="flex items-center gap-4 p-3 bg-admin-bg rounded-xl border border-dashed border-admin-tint">
                  {imagePreview ? (
                    <div className="w-16 h-16 rounded-lg bg-white overflow-hidden p-1 shrink-0 border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-admin-muted">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs text-admin-muted"
                  />
                </div>
                <input
                  type="url"
                  placeholder="Hoặc nhập link ảnh URL (vd: https://fakestoreapi.com/img/...)"
                  value={formData.image || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({ ...formData, image: url });
                    if (!imageFile) setImagePreview(url);
                  }}
                  className="w-full px-3.5 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs text-brand-green"
                />
              </div>

              <div>
                <label htmlFor="prod-desc" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                  Mô tả sản phẩm
                </label>
                <textarea
                  id="prod-desc"
                  rows={2}
                  placeholder="Giới thiệu tính năng nổi bật..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-admin-soft">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-admin-border text-xs font-bold text-admin-muted hover:bg-admin-soft cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs text-admin-muted">
          Đang tải danh sách sản phẩm...
        </div>
      }
    >
      <AdminProductsContent />
    </Suspense>
  );
}
