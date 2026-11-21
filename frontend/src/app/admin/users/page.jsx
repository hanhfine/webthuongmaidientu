'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const loadUsers = useCallback(async (targetPage = page, q = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api.get(`/api/admin/users?${params.toString()}`);
      if (data?.items) {
        setUsers(data.items);
        setTotal(data.total ?? data.items.length);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setTotal(data.length);
      }
    } catch {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadUsers(page, searchQuery);
    }, 200);
    return () => clearTimeout(t);
  }, [page, searchQuery, loadUsers]);

  const handleToggleStatus = async (user) => {
    const uid = user.id || user._id;
    if (!uid) {
      toast.error('Không xác định được ID tài khoản');
      return;
    }
    if (uid === currentUser?.id) {
      toast.error('Bạn không thể tự khóa tài khoản quản trị của chính mình');
      return;
    }

    try {
      setTogglingId(uid);
      const nextStatus = !user.isActive;
      await api.patch(`/api/admin/users/${uid}/status`, { isActive: nextStatus });
      toast.success(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản "${user.email}"!`);
      loadUsers(page, searchQuery);
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái người dùng');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
          TÀI KHOẢN NGƯỜI DÙNG
        </span>
        <h1 className="text-3xl font-black text-brand-green tracking-tight">
          Người dùng
        </h1>
        <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
          Quản lý tài khoản khách hàng, phân quyền và trạng thái bảo mật.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-admin-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo họ tên hoặc email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <span className="text-xs font-semibold text-admin-muted tabular-nums">
            {total} tài khoản
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Tài khoản</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Liên hệ</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Vai trò</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngày tham gia</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const uid = u.id || u._id;
                  const isCurrent = uid === currentUser?.id;
                  const isToggling = togglingId === uid;

                  return (
                    <tr key={uid} className="hover:bg-admin-surface transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-admin-soft text-brand-green font-bold text-xs flex items-center justify-center shrink-0">
                            {u.fullName?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-brand-green truncate">
                              {u.fullName || 'Khách hàng'}
                              {isCurrent && (
                                <span className="ml-2 text-xs font-bold text-brand-green-light bg-admin-soft px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Bạn
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-admin-muted truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono tabular-nums whitespace-nowrap">
                        {u.phone || <span className="text-admin-muted">—</span>}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ring-1 ring-inset ring-black/5 ${
                          u.role === 'admin'
                            ? 'bg-zinc-100 text-zinc-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {u.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 shrink-0" /> Quản trị
                            </>
                          ) : (
                            'Khách hàng'
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-admin-muted tabular-nums whitespace-nowrap">
                        {formatDate(u.createdAt) || '—'}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          disabled={isCurrent || isToggling}
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-40 cursor-pointer ring-1 ring-inset ring-black/5 ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-500/10 hover:text-rose-700'
                              : 'bg-red-50 text-red-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <Unlock className="w-3 h-3 shrink-0" /> Đang hoạt động (Khóa)
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 shrink-0" /> Đã khóa (Mở khóa)
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-admin-muted">
                    Không tìm thấy tài khoản người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-soft flex flex-wrap items-center justify-between gap-3 text-xs text-admin-muted">
            <span className="tabular-nums">
              Trang {page} / {totalPages} • {total} tài khoản
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
