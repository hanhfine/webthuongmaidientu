'use client';

import { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  X, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminPromotionsPage() {
  const toast = useToast();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent', // percent or fixed
    value: '',
    minOrder: '0',
    maxUses: '100',
    startsAt: new Date().toISOString().split('T')[0],
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadPromos = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/promotions');
      if (Array.isArray(data)) {
        setPromotions(data);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleToggleStatus = async (promo) => {
    try {
      await api.put(`/api/admin/promotions/${promo._id}`, {
        isActive: !promo.isActive,
      });
      toast.success(`Đã ${!promo.isActive ? 'kích hoạt' : 'tạm dừng'} mã "${promo.code}"!`);
      loadPromos();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setModalError('');

    const valNum = parseInt(formData.value, 10);
    const minOrderNum = parseInt(formData.minOrder, 10) || 0;
    const maxUsesNum = parseInt(formData.maxUses, 10);

    if (!formData.code.trim()) {
      setModalError('Mã giảm giá không được để trống');
      return;
    }
    if (isNaN(valNum) || valNum <= 0) {
      setModalError('Giá trị giảm phải lớn hơn 0');
      return;
    }
    if (formData.type === 'percent' && valNum > 100) {
      setModalError('Phần trăm giảm tối đa 100%');
      return;
    }

    try {
      setSaving(true);
      await api.post('/api/admin/promotions', {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: valNum,
        minOrder: minOrderNum,
        maxUses: maxUsesNum,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: new Date(formData.endsAt).toISOString(),
        isActive: formData.isActive,
      });

      toast.success(`Tạo mã voucher "${formData.code.toUpperCase()}" thành công!`);
      setIsModalOpen(false);
      loadPromos();
    } catch (err) {
      setModalError(err.message || 'Không thể tạo mã voucher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
            CAMPAIGNS & DISCOUNTS
          </span>
          <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
            Promotions
          </h1>
          <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
            Quản lý các chương trình ưu đãi, mã giảm giá và kích cầu doanh số.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              code: '',
              type: 'percent',
              value: '',
              minOrder: '0',
              maxUses: '100',
              startsAt: new Date().toISOString().split('T')[0],
              endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              isActive: true,
            });
            setModalError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo mã Voucher</span>
        </button>
      </div>

      {/* 2. Promotions Table Card */}
      <div className="rounded-3xl bg-white border border-[#e1e6e0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1c3f30]">
            <thead className="bg-[#f8faf8] border-b border-[#edf2ee] text-[11px] font-bold text-[#6e8578] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Voucher Code</th>
                <th className="py-3.5 px-4">Discount Value</th>
                <th className="py-3.5 px-4">Min Order</th>
                <th className="py-3.5 px-4">Usage Limit</th>
                <th className="py-3.5 px-4">Validity</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#788e81]">
                    Đang tải danh sách khuyến mãi...
                  </td>
                </tr>
              ) : promotions.length > 0 ? (
                promotions.map((p) => {
                  const isExpired = new Date(p.endsAt) < new Date();
                  const isMaxed = p.usedCount >= p.maxUses;

                  return (
                    <tr key={p._id} className="hover:bg-[#f8faf8] transition-colors">
                      {/* Code */}
                      <td className="py-4 px-6 font-mono font-black text-sm">
                        <span className="px-2.5 py-1 rounded-lg bg-[#edf2ee] text-[#1c3f30] border border-[#d9e2db]">
                          {p.code}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-4 px-4 font-bold text-sm">
                        {p.type === 'percent' ? `${p.value}%` : formatVND(p.value)}
                        <span className="text-[10px] text-[#788e81] block font-normal">
                          {p.type === 'percent' ? 'Phần trăm' : 'Số tiền cố định'}
                        </span>
                      </td>

                      {/* Min Order */}
                      <td className="py-4 px-4 font-semibold">
                        {p.minOrder > 0 ? formatVND(p.minOrder) : '0 ₫'}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-4">
                        <span className="font-bold">{p.usedCount}</span>
                        <span className="text-neutral-400"> / {p.maxUses} lượt</span>
                      </td>

                      {/* Validity */}
                      <td className="py-4 px-4 text-[#788e81] text-[11px]">
                        <span>{formatDate(p.startsAt)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatDate(p.endsAt)}</span>
                        {isExpired && (
                          <span className="text-rose-500 font-bold block">Hết hạn</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            p.isActive && !isExpired && !isMaxed
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-600' : 'bg-neutral-400'}`} />
                          {p.isActive ? 'Kích hoạt' : 'Tạm dừng'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#788e81]">
                    Chưa có mã khuyến mãi nào. Hãy tạo mã đầu tiên!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Create Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#e1e6e0] shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ee]">
              <h3 className="text-lg font-black text-[#1c3f30]">
                Tạo Mã Giảm Giá Mới
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

            <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1c3f30] mb-1">Mã Voucher (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: WELCOME10, BLACKFRIDAY"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-mono font-bold uppercase text-[#1c3f30] focus:ring-2 focus:ring-[#1c3f30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Loại giảm giá</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  >
                    <option value="percent">Theo phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Giá trị giảm *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder={formData.type === 'percent' ? '10 (%)' : '500000 (₫)'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Đơn tối thiểu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Lượt dùng tối đa</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1c3f30] mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    required
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f4f6f3] border-none rounded-xl text-xs font-semibold text-[#1c3f30]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#edf2ee]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full border border-[#e1e6e0] text-xs font-bold text-[#5d7367]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {saving ? 'Đang tạo...' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
