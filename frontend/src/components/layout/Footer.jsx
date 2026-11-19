import Link from 'next/link';
import { ShieldCheck, Award, Globe, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 text-xs">
      {/* Top Banner: Commitments / USPs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-brand-blue shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-neutral-900 dark:text-white text-sm">Chính Hãng 100%</h5>
                <p className="text-neutral-500 text-xs mt-0.5">Bảo hành toàn diện 12 - 24 tháng</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-neutral-900 dark:text-white text-sm">Giao Hàng Siêu Tốc</h5>
                <p className="text-neutral-500 text-xs mt-0.5">Miễn phí giao hàng nội thành</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-neutral-900 dark:text-white text-sm">Đổi Trả Dễ Dàng</h5>
                <p className="text-neutral-500 text-xs mt-0.5">15 ngày 1 đổi 1 nếu lỗi NSX</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-neutral-900 dark:text-white text-sm">Hỗ Trợ 24/7</h5>
                <p className="text-neutral-500 text-xs mt-0.5">Hotline miễn phí 1800 xxxx</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 5-Column Navigation Links */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Col 1: Mua Trực Tuyến */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-4">Mua Trực Tuyến</h4>
            <ul className="space-y-2.5">
              <li><Link href="/products" className="hover:text-brand-blue transition-colors">Trang chủ Mua trực tuyến</Link></li>
              <li><Link href="/products" className="hover:text-brand-blue transition-colors">Mua Hàng Trực Tiếp Ưu Đãi Vượt Trội</Link></li>
              <li><Link href="/products" className="hover:text-brand-blue transition-colors">Chương Trình Thu Cũ Đổi Mới</Link></li>
              <li><Link href="/products" className="hover:text-brand-blue transition-colors">Gói Bảo Hành VIP Care+</Link></li>
              <li><Link href="/products" className="hover:text-brand-blue transition-colors">Ưu Đãi HSSV & Giáo Dục</Link></li>
            </ul>
          </div>

          {/* Col 2: Sản Phẩm */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-4">Sản Phẩm</h4>
            <ul className="space-y-2.5">
              <li><Link href="/products?category=dien-thoai" className="hover:text-brand-blue transition-colors">Điện thoại thông minh Flagship</Link></li>
              <li><Link href="/products?category=laptop" className="hover:text-brand-blue transition-colors">Máy tính bảng & Laptop Pro</Link></li>
              <li><Link href="/products?category=thiet-bi-deo" className="hover:text-brand-blue transition-colors">Đồng hồ & Vòng đeo thông minh</Link></li>
              <li><Link href="/products?category=thiet-bi-deo" className="hover:text-brand-blue transition-colors">Tai nghe không dây & Loa Hi-Res</Link></li>
              <li><Link href="/products?category=phu-kien" className="hover:text-brand-blue transition-colors">Phụ kiện & Củ sạc nhanh</Link></li>
            </ul>
          </div>

          {/* Col 3: Bạn Cần Hỗ Trợ? */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-4">Bạn Cần Hỗ Trợ?</h4>
            <ul className="space-y-2.5">
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Hướng dẫn sử dụng & Kích hoạt</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Chính sách bảo hành chính hãng</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Bảng giá linh kiện & sửa chữa</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Tra cứu tiến độ sửa chữa</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Tư vấn trực tuyến qua Zalo / Hotline</span></li>
            </ul>
          </div>

          {/* Col 4: Tài Khoản */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-4">Tài Khoản</h4>
            <ul className="space-y-2.5">
              <li><Link href="/orders" className="hover:text-brand-blue transition-colors">Đơn hàng của tôi</Link></li>
              <li><Link href="/cart" className="hover:text-brand-blue transition-colors">Giỏ hàng mua sắm</Link></li>
              <li><Link href="/login" className="hover:text-brand-blue transition-colors">Đăng nhập tài khoản</Link></li>
              <li><Link href="/register" className="hover:text-brand-blue transition-colors">Đăng ký thành viên mới</Link></li>
              <li><Link href="/admin" className="hover:text-brand-blue transition-colors">Cổng Quản Trị Seller Studio</Link></li>
            </ul>
          </div>

          {/* Col 5: Giới Thiệu & Pháp Lý */}
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm mb-4">Giới Thiệu Về Chúng Tôi</h4>
            <ul className="space-y-2.5">
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Thông tin về TechStore</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Bảo mật & Quyền riêng tư</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Điều khoản dịch vụ mua sắm</span></li>
              <li><span className="hover:text-brand-blue transition-colors cursor-pointer">Hệ thống showroom trải nghiệm</span></li>
            </ul>
          </div>
        </div>

        {/* Legal, Corporate & Badges Section */}
        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl text-[11px] text-neutral-500">
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">
              CÔNG TY TNHH THƯƠNG MẠI & CÔNG NGHỆ TECHSTORE VIỆT NAM
            </p>
            <p>
              Địa chỉ: Tòa nhà Bitexco, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam.
            </p>
            <p>
              GPĐKKD số: 0300741922 do Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh cấp.
            </p>
            <p className="pt-2">
              Bản quyền © 1995-2026 TechStore. Bảo lưu mọi quyền.
            </p>
          </div>

          {/* Ministry of Industry and Trade badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-full border border-blue-600 text-blue-600 font-bold text-[10px] uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG
            </div>
            <div className="px-3 py-1.5 rounded-full border border-red-600 text-red-600 font-bold text-[10px] uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              ĐÃ ĐĂNG KÝ BỘ CÔNG THƯƠNG
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
