'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  X,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

function toVnDateInput(dateVal) {
  if (!dateVal) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateVal));
}

export default function AdminPromotionsPage() {
  const toast = useToast();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrder: '0',
    maxUses: '100',
    startsAt: toVnDateInput(new Date()),
    endsAt: toVnDateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadPromos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/promotions');
      if (Array.isArray(data)) {
        setPromotions(data);
      }
    } catch {
      toast.error('Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

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

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setFormData({
      code: '',
      type: 'percent',
      value: '',
      minOrder: '0',
      maxUses: '100',
      startsAt: toVnDateInput(new Date()),
      endsAt: toVnDateInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      isActive: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      minOrder: String(promo.minOrder || 0),
      maxUses: String(promo.maxUses || 100),
      startsAt: toVnDateInput(promo.startsAt),
      endsAt: toVnDateInput(promo.endsAt),
      isActive: promo.isActive,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    setModalError('');

    const valNum = parseInt(formData.value, 10);
    const minOrderNum = parseInt(formData.minOrder, 10) || 0;
    const maxUsesNum = parseInt(formData.maxUses, 10);

    if (!formData.code.trim() || formData.code.trim().length < 3) {
      setModalError('Mã giảm giá cần tối thiểu 3 ký tự');
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

    const startIso = `${formData.startsAt}T00:00:00+07:00`;
    const endIso = `${formData.endsAt}T23:59:59+07:00`;
    if (new Date(endIso) <= new Date(startIso)) {
      setModalError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: valNum,
        minOrder: minOrderNum,
        maxUses: maxUsesNum,
        startsAt: new Date(startIso).toISOString(),
        endsAt: new Date(endIso).toISOString(),
        isActive: formData.isActive,
      };

      if (editingPromo) {
        await api.put(`/api/admin/promotions/${editingPromo._id}`, payload);
        toast.success(`Đã cập nhật voucher "${payload.code}"!`);
      } else {
        await api.post('/api/admin/promotions', payload);
        toast.success(`Tạo mã voucher "${payload.code}" thành công!`);
      }

      setIsModalOpen(false);
      loadPromos();
    } catch (err) {
      const detail = err.fieldErrors
        ? Object.entries(err.fieldErrors)
            .map(([k, msgs]) => `${k}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' • ')
        : '';
      setModalError(detail ? `${err.message} (${detail})` : err.message || 'Không thể lưu mã voucher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
            CHƯƠNG TRÌNH ƯU ĐÃI
          </span>
          <h1 className="text-3xl font-black text-brand-green tracking-tight">
            Khuyến mãi
          </h1>
          <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
            Quản lý các chương trình ưu đãi, mã giảm giá và kích cầu doanh số.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors w-fit whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Tạo mã Voucher</span>
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Mã voucher</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Mức giảm</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Đơn tối thiểu</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Lượt dùng</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Hiệu lực</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Trạng thái & Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-admin-muted">
                    Đang tải danh sách khuyến mãi...
                  </td>
                </tr>
              ) : promotions.length > 0 ? (
                promotions.map((p) => {
                  const isExpired = new Date(p.endsAt) < new Date();
                  const isMaxed = p.usedCount >= p.maxUses;

                  const statusTone = !p.isActive
                    ? 'bg-zinc-100 text-zinc-700'
                    : isExpired
                    ? 'bg-red-50 text-red-700'
                    : isMaxed
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700';

                  const statusText = !p.isActive
                    ? 'Tạm dừng'
                    : isExpired
                    ? 'Hết hạn'
                    : isMaxed
                    ? 'Hết lượt'
                    : 'Kích hoạt';

                  return (
                    <tr key={p._id} className="hover:bg-admin-surface transition-colors">
                      <td className="py-4 px-6 font-mono font-black text-sm whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-admin-soft text-brand-green border border-admin-border-soft whitespace-nowrap">
                          {p.code}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-sm tabular-nums whitespace-nowrap">
                        {p.type === 'percent' ? `${p.value}%` : formatVND(p.value)}
                        <span className="text-xs text-admin-muted block font-normal">
                          {p.type === 'percent' ? 'Phần trăm' : 'Số tiền cố định'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-semibold tabular-nums whitespace-nowrap">
                        {p.minOrder > 0 ? formatVND(p.minOrder) : '0\u00a0₫'}
                      </td>

                      <td className="py-4 px-4 tabular-nums whitespace-nowrap">
                        <span className="font-bold">{p.usedCount}</span>
                        <span className="text-admin-muted"> / {p.maxUses} lượt</span>
                      </td>

                      <td className="py-4 px-4 text-admin-muted text-xs tabular-nums whitespace-nowrap">
                        <span>{formatDate(p.startsAt)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatDate(p.endsAt)}</span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ring-1 ring-inset ring-black/5 ${statusTone}`}
                            title="Bấm để bật/tắt trạng thái"
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {statusText}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 rounded-lg text-admin-muted hover:text-brand-green hover:bg-admin-soft transition-colors cursor-pointer"
                            title="Chỉnh sửa voucher"
                            aria-label={`Chỉnh sửa ${p.code}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-admin-muted">
                    Chưa có mã khuyến mãi nào. Hãy tạo mã đầu tiên!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-admin-border shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-admin-soft">
              <h3 className="text-lg font-black text-brand-green">
                {editingPromo ? `Sửa Voucher ${editingPromo.code}` : 'Tạo Mã Giảm Giá Mới'}
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

            <form onSubmit={handleSavePromo} className="space-y-4 text-xs">
              <div>
                <label htmlFor="promo-code" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                  Mã Voucher (Code) <span className="text-red-600">*</span>
                </label>
                <input
                  id="promo-code"
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  placeholder="VD: WELCOME10"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-mono font-bold uppercase text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-type" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Loại giảm giá
                  </label>
                  <select
                    id="promo-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  >
                    <option value="percent">Theo phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="promo-value" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Giá trị giảm <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="promo-value"
                    type="number"
                    min="1"
                    required
                    placeholder={formData.type === 'percent' ? '10 (%)' : '500000 (₫)'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-min" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Đơn tối thiểu (VND)
                  </label>
                  <input
                    id="promo-min"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  />
                </div>
                <div>
                  <label htmlFor="promo-max" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Lượt dùng tối đa <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="promo-max"
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promo-start" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    id="promo-start"
                    type="date"
                    required
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  />
                </div>
                <div>
                  <label htmlFor="promo-end" className="block w-fit cursor-pointer font-bold text-brand-green mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    id="promo-end"
                    type="date"
                    required
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-admin-soft">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-admin-border text-xs font-bold text-admin-muted hover:bg-admin-soft cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : editingPromo ? 'Lưu thay đổi' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
