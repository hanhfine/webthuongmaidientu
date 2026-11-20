'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  User, 
  Lock, 
  Unlock, 
  Clock 
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/users');
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    if (user._id === currentUser?.id) {
      toast.error('Bạn không thể tự khóa tài khoản quản trị của chính mình');
      return;
    }

    try {
      setTogglingId(user._id);
      const nextStatus = !user.isActive;
      await api.patch(`/api/admin/users/${user._id}/status`, { isActive: nextStatus });
      toast.success(`Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản "${user.email}"!`);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái người dùng');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div>
        <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
          USER ACCOUNTS
        </span>
        <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
          Users
        </h1>
        <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
          Quản lý tài khoản khách hàng, phân quyền và trạng thái bảo mật.
        </p>
      </div>

      {/* 2. Table Card */}
      <div className="rounded-3xl bg-white border border-[#e1e6e0] shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-5 sm:p-6 border-b border-[#edf2ee] flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#788e81] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f4f6f3] border-none rounded-full text-xs font-semibold text-[#1c3f30] placeholder-[#788e81] focus:ring-2 focus:ring-[#1c3f30]"
            />
          </div>

          <span className="text-xs font-semibold text-[#6e8578]">
            {filteredUsers.length} tài khoản
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1c3f30]">
            <thead className="bg-[#f8faf8] border-b border-[#edf2ee] text-[11px] font-bold text-[#6e8578] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">User Profile</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-6 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isCurrent = u._id === currentUser?.id;
                  const isToggling = togglingId === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-[#f8faf8] transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#edf2ee] text-[#1c3f30] font-bold text-xs flex items-center justify-center shrink-0">
                            {u.fullName?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1c3f30]">
                              {u.fullName || 'Khách hàng'}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] font-bold text-[#2d6a4f] bg-[#edf2ee] px-2 py-0.5 rounded-full">
                                  Bạn
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-[#788e81]">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 font-mono">
                        {u.phone || <span className="text-neutral-400 italic">Chưa cập nhật</span>}
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {u.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </>
                          ) : (
                            'Customer'
                          )}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 text-[#788e81]">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Lock / Unlock Toggle Action */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          disabled={isCurrent || isToggling}
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all disabled:opacity-40 ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                              : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title={isCurrent ? 'Không thể tự khóa tài khoản' : u.isActive ? 'Bấm để khóa' : 'Bấm để mở khóa'}
                        >
                          {u.isActive ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Hoạt động</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Đã khóa</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#788e81]">
                    Không tìm thấy người dùng nào.
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
