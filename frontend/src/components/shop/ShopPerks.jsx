'use client';

import Link from 'next/link';
import { Store, Award, ShieldCheck, Truck, ChevronRight } from 'lucide-react';

const PERKS = [
  {
    icon: Store,
    title: 'Mua trực tuyến - Nhận tại cửa hàng',
    desc: 'Tặng mã voucher gia dụng/TV tới 3.5 Triệu khi mua điện thoại nhận tại hệ thống cửa hàng',
    linkText: 'Tìm hiểu thêm',
    href: '/products?category=dien-thoai',
    iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
  },
  {
    icon: Award,
    title: 'TechStore Rewards',
    desc: 'Nhận điểm thưởng cho mỗi lần mua sắm, tích lũy đổi voucher giảm giá đơn hàng tiếp theo',
    linkText: 'Tìm hiểu thêm',
    href: '/orders',
    iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo Hành VIP Care+',
    desc: 'Dịch vụ chăm sóc và bảo hiểm toàn diện từ các chuyên gia kỹ thuật được ủy quyền',
    linkText: 'Tìm hiểu thêm',
    href: '/products',
    iconColor: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40',
  },
  {
    icon: Truck,
    title: 'Miễn phí giao hàng & Lắp đặt',
    desc: 'Tận hưởng chính sách giao hàng miễn phí tận nơi trên toàn quốc, giao nhanh 2 giờ',
    linkText: 'Tìm hiểu thêm',
    href: '/cart',
    iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  },
];

export default function ShopPerks() {
  return (
    <section className="py-8">
      {/* Title & Learn More Link */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Mua trực tiếp Nhận ngay ưu đãi
        </h2>
        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Tìm hiểu thêm
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4 Feature Benefit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PERKS.map((perk, i) => {
          const Icon = perk.icon;
          return (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all group"
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${perk.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2 leading-snug">
                  {perk.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                  {perk.desc}
                </p>
              </div>

              <Link
                href={perk.href}
                className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:text-brand-blue dark:hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
              >
                {perk.linkText}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
