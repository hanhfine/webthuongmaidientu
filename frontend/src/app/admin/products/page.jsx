'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  Eye, 
  Edit3, 
  Trash2, 
  Layers, 
  AlertTriangle, 
  Upload,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, hidden
  const [sortBy, setSortBy] = useState('newest');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Samsung',
    categoryId: '',
    price: '',
    stock: '',
    description: '',
    specs: { 'Màn hình': '', 'Vi xử lý': '', 'RAM': '', 'Pin': '' },
    imageId: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Load products & categories
  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/api/admin/products'),
        api.get('/api/admin/categories').catch(() => []),
      ]);

      if (prodRes?.items) {
        setProducts(prodRes.items);
      } else if (Array.isArray(prodRes)) {
        setProducts(prodRes);
      }

      if (Array.isArray(catRes)) {
        setCategories(catRes);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Compute 4 Top Metrics
  const allListingsCount = products.length;
  const activeNowCount = products.filter((p) => p.isActive).length;
  const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const stockAlertsCount = products.filter((p) => p.stock <= 10).length;

  // Filter & Sort Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' 
        ? p.isActive 
        : !p.isActive;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === '-price') return b.price - a.price;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Open Modal Helper
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'Samsung',
      categoryId: categories[0]?._id || '',
      price: '',
      stock: '',
      description: '',
      specs: { 'Màn hình': '', 'Vi xử lý': '', 'RAM': '', 'Pin': '' },
      imageId: null,
    });
    setImageFile(null);
    setImagePreview('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      brand: prod.brand || 'Samsung',
      categoryId: prod.categoryId || (categories[0]?._id || ''),
      price: String(prod.price),
      stock: String(prod.stock),
      description: prod.description || '',
      specs: prod.specs || { 'Màn hình': '', 'Vi xử lý': '', 'RAM': '', 'Pin': '' },
      imageId: prod.imageId || null,
    });
    setImageFile(null);
    setImagePreview(prod.imageId ? `/api/images/${prod.imageId}` : '');
    setModalError('');
    setIsModalOpen(true);
  };

  // Toggle Hide / Active
  const handleToggleActive = async (prod) => {
    try {
      if (prod.isActive) {
        // Soft delete/archive
        await api.delete(`/api/products/${prod._id}`);
        toast.info(`Đã ẩn sản phẩm "${prod.name}"`);
      } else {
        // Unhide
        await api.put(`/api/products/${prod._id}`, { isActive: true });
        toast.success(`Đã hiển thị lại sản phẩm "${prod.name}"`);
      }
      loadCatalog();
    } catch (err) {
      toast.error(err.message || 'Thao tác không thành công');
    }
  };

  // Handle Form Submit with Image Upload
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim()) {
      setModalError('Tên sản phẩm không được để trống');
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

      // 1. Upload new image if selected
      if (imageFile) {
        const imgForm = new FormData();
        imgForm.append('file', imageFile);
        const uploadRes = await api.post('/api/images', imgForm);
        finalImageId = uploadRes.id || uploadRes._id;
      }

      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        categoryId: formData.categoryId || undefined,
        price: priceNum,
        stock: stockNum,
        description: formData.description.trim(),
        specs: formData.specs,
        imageId: finalImageId || undefined,
      };

      if (editingProduct) {
        await api.put(`/api/products/${editingProduct._id}`, payload);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/api/products', payload);
        toast.success('Thêm sản phẩm mới thành công!');
      }

      setIsModalOpen(false);
      loadCatalog();
    } catch (err) {
      setModalError(err.message || 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Breadcrumb & Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
            YOUR CATALOG
          </span>
          <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
            Products
          </h1>
          <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
            Quản lý toàn bộ danh sách sản phẩm hiển thị trên cửa hàng của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add a product</span>
        </button>
      </div>

      {/* 2. Four Metric Summary Cards (Tandem Products Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">All listings</p>
          <p className="text-2xl font-black text-[#1c3f30] mt-1">{allListingsCount}</p>
          <p className="text-[11px] text-[#788e81] mt-0.5">Across catalog</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">Active now</p>
          <p className="text-2xl font-black text-[#1c3f30] mt-1">{activeNowCount}</p>
          <p className="text-[11px] text-[#788e81] mt-0.5">Available in your shop</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">Stock value</p>
          <p className="text-xl sm:text-2xl font-black text-[#1c3f30] mt-1 truncate">
            {formatVND(totalStockValue)}
          </p>
          <p className="text-[11px] text-[#788e81] mt-0.5">Current listed price × units</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">Stock alerts</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{stockAlertsCount}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">At or below low stock</p>
        </div>
      </div>

      {/* 3. Store Catalog Card with Table */}
      <div className="rounded-3xl bg-white border border-[#e1e6e0] shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 sm:p-6 border-b border-[#edf2ee] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#788e81] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, SKU, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f4f6f3] border-none rounded-full text-xs font-semibold text-[#1c3f30] placeholder-[#788e81] focus:ring-2 focus:ring-[#1c3f30]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-[#f4f6f3] rounded-full text-xs font-bold text-[#1c3f30] border-none cursor-pointer focus:ring-2 focus:ring-[#1c3f30]"
              >
                <option value="all">Tất cả sản phẩm</option>
                <option value="active">Đang mở bán</option>
                <option value="hidden">Đã ẩn</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#788e81] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-[#f4f6f3] rounded-full text-xs font-bold text-[#1c3f30] border-none cursor-pointer focus:ring-2 focus:ring-[#1c3f30]"
              >
                <option value="newest">Mới nhất</option>
                <option value="price">Giá thấp đến cao</option>
                <option value="-price">Giá cao đến thấp</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#788e81] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1c3f30]">
            <thead className="bg-[#f8faf8] border-b border-[#edf2ee] text-[11px] font-bold text-[#6e8578] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Đang tải danh mục sản phẩm...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
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

                      {/* Price */}
                      <td className="py-4 px-4 font-black text-sm">
                        {formatVND(prod.price)}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-sm block">{prod.stock}</span>
                        <span className={`text-[10px] font-semibold ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-[#2d6a4f]'
                        }`}>
                          {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                        </span>
                      </td>

                      {/* Status Pill */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          prod.isActive
                            ? 'bg-[#edf2ee] text-[#2d6a4f]'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prod.isActive ? 'bg-[#2d6a4f]' : 'bg-neutral-400'}`} />
                          {prod.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/products/${prod._id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-[#788e81] hover:text-[#1c3f30] hover:bg-[#edf2ee] transition-colors"
                            title="Xem trên trang khách"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 rounded-lg text-[#788e81] hover:text-[#1c3f30] hover:bg-[#edf2ee] transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(prod)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              prod.isActive
                                ? 'text-[#788e81] hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={prod.isActive ? 'Ẩn sản phẩm' : 'Hiển thị lại'}
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
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#e1e6e0] shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ee]">
              <h3 className="text-lg font-black text-[#1c3f30]">
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-bold text-[#1c3f30] mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="Galaxy S26 Ultra 512GB"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Hãng (Brand) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Samsung"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Danh mục</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Giá bán (VND) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="36900000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Số lượng tồn kho *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="50"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block font-bold text-[#1c3f30] mb-1">Ảnh sản phẩm (Tối đa 2MB)</label>
                <div className="flex items-center gap-4 p-3 bg-[#f4f6f3] rounded-xl border border-dashed border-[#c8dec9]">
                  {imagePreview ? (
                    <div className="w-16 h-16 rounded-lg bg-white overflow-hidden p-1 shrink-0 border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#788e81]">
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
                    className="text-xs text-[#5d7367]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#1c3f30] mb-1">Mô tả sản phẩm</label>
                <textarea
                  rows={2}
                  placeholder="Giới thiệu tính năng nổi bật..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#edf2ee]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#e1e6e0] text-xs font-bold text-[#5d7367] hover:bg-[#edf2ee]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all disabled:opacity-50"
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
