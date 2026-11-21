'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Tag, Sparkles, Zap, Gift } from 'lucide-react';

const DEAL_TABS = [
  { id: 'all', label: 'Mới' },
  { id: 'dien-thoai', label: 'Di động' },
  { id: 'tv', label: 'TV' },
  { id: 'gia-dung', label: 'Gia dụng' },
  { id: 'laptop', label: 'Màn hình máy tính' },
];

const DEAL_CARDS = {
  all: [
    {
      badge: 'Featured Deal',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      icon: Sparkles,
      title: 'Galaxy Z Fold8 AI Ultra',
      promo: 'Ưu đãi giảm giá tới 5.000.000 ₫',
      desc: 'Mở rộng khung hình, mãn nhãn trên mọi hành trình cùng màn hình Dynamic AMOLED gập thế hệ mới.',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
    {
      badge: 'Hot Deal',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      icon: Zap,
      title: 'Galaxy Z Flip8 Bespoke',
      promo: 'Tặng bộ quà phụ kiện trị giá 3.2Tr',
      desc: 'Thiết kế gập vỏ sò thời thượng, camera FlexCam sắc nét và bộ ốp lưng thời trang độc quyền.',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
    {
      badge: 'Trợ Giá Thu Cũ',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      icon: Tag,
      title: 'Galaxy S26 Ultra 512GB',
      promo: 'Trợ giá lên đời tới 8.000.000 ₫',
      desc: 'Camera 200MP đột phá, bút S-Pen tích hợp và quyền năng xử lý trí tuệ nhân tạo Galaxy AI tối tân.',
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
    {
      badge: 'Quà Tặng VIP',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: Gift,
      title: 'Galaxy Tab S12+ 5G',
      promo: 'Tặng bàn phím Book Cover 2.5Tr',
      desc: 'Hiệu năng làm việc và giải trí không giới hạn với màn hình 12.4 inch 120Hz và chip 8 nhân mạnh mẽ.',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
      href: '/products?category=laptop',
    },
  ],
  'dien-thoai': [
    {
      badge: 'Flagship AI',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      icon: Sparkles,
      title: 'Galaxy S26 Ultra 512GB',
      promo: 'Trợ giá lên đời tới 8.000.000 ₫',
      desc: 'Trải nghiệm đỉnh cao công nghệ chụp ảnh đêm và zoom quang học 100x với cảm biến thế hệ mới.',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
    {
      badge: 'Bestseller',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      icon: Zap,
      title: 'iPhone 15 Pro Max 256GB',
      promo: 'Giảm ngay 2.500.000 ₫ thanh toán thẻ',
      desc: 'Khung viền Titanium chuẩn hàng không vũ trụ, nút Action Button thông minh và chip A17 Pro.',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80',
      href: '/products?category=dien-thoai&brand=Apple',
    },
    {
      badge: 'Thời Thượng',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      icon: Gift,
      title: 'Galaxy Z Flip8 Bespoke',
      promo: 'Tặng gói bảo hành Care+ 1 năm',
      desc: 'Thiết kế gập nhỏ gọn tinh tế, cá nhân hóa màu sắc đa dạng theo gu thời trang của riêng bạn.',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
    {
      badge: 'Pin Khủng',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: Tag,
      title: 'Galaxy A56 5G Chống Nước',
      promo: 'Giá sốc chỉ từ 8.990.000 ₫',
      desc: 'Màn hình Super AMOLED 120Hz mượt mà, viên pin lớn 5000mAh và kháng nước chuẩn IP67 bền bỉ.',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
      href: '/products?category=dien-thoai',
    },
  ],
  tv: [
    {
      badge: 'Đỉnh Cao 8K',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      icon: Sparkles,
      title: 'Smart TV Neo QLED 8K 65"',
      promo: 'Tặng kèm Loa Thanh Soundbar 6.5Tr',
      desc: 'Bộ xử lý NQ8 AI Gen3 nâng cấp hình ảnh lên chuẩn 8K ngoạn mục cùng âm thanh vòm Dolby Atmos.',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Nghệ Thuật',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      icon: Gift,
      title: 'The Frame TV Khung Tranh 55"',
      promo: 'Tặng khung viền gỗ + 1 năm tranh bản quyền',
      desc: 'Màn hình chống phản sáng Matte Display biến không gian phòng khách thành bảo tàng nghệ thuật sống động.',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Điện Ảnh',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      icon: Zap,
      title: 'OLED Vision 4K 55 inch',
      promo: 'Giảm trực tiếp 4.000.000 ₫',
      desc: 'Màu đen sâu thẳm, màu sắc rực rỡ với các điểm ảnh tự phát sáng chuẩn điện ảnh Hollywood.',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Âm Thanh Vòm',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: Tag,
      title: 'Loa Thanh Q-Series 11.1.4 Kênh',
      promo: 'Giảm 30% khi mua kèm TV',
      desc: 'Công nghệ Q-Symphony đồng bộ hoàn hảo loa TV và loa thanh cho trải nghiệm rạp chiếu tại gia.',
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80',
      href: '/products?category=phu-kien',
    },
  ],
  'gia-dung': [
    {
      badge: 'Thông Minh AI',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      icon: Sparkles,
      title: 'Tủ Lạnh 4 Cửa Bespoke AI',
      promo: 'Tặng lò vi sóng nướng cao cấp 3.2Tr',
      desc: 'Tự động kiểm soát nhiệt độ thông minh qua app SmartThings, bảo quản thực phẩm tươi ngon trọn vị.',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Tiết Kiệm Điện',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: Zap,
      title: 'Máy Giặt Sấy AI EcoBubble 12kg',
      promo: 'Bảo hành động cơ Digital Inverter 20 năm',
      desc: 'Cảm biến chất liệu sợi vải và độ bẩn để tự động phân bổ nước giặt xả và thời gian giặt tối ưu.',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Lực Hút Khủng',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      icon: Tag,
      title: 'Máy Hút Bụi Không Dây Jet AI',
      promo: 'Giảm 1.500.000 ₫ + Tặng đầu hút thảm',
      desc: 'Công suất hút 280W siêu mạnh, trạm làm sạch tự động đổ rác khép kín đảm bảo vệ sinh tuyệt đối.',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
      href: '/products',
    },
    {
      badge: 'Không Khí Sạch',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      icon: Gift,
      title: 'Máy Lọc Không Khí Diệt Khuẩn',
      promo: 'Tặng màng lọc HEPA cao cấp thay thế',
      desc: 'Hệ thống lọc 3 lớp loại bỏ 99.97% bụi mịn PM0.3 và vi khuẩn, mang lại không gian trong lành.',
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80',
      href: '/products',
    },
  ],
  laptop: [
    {
      badge: 'Hiệu Năng Khủng',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      icon: Sparkles,
      title: 'MacBook Pro 16 M3 Max',
      promo: 'Giảm ngay 3.000.000 ₫ cho lập trình viên',
      desc: 'CPU 16 lõi, GPU 40 lõi siêu mạnh mẽ, hỗ trợ render video 8K ProRes và huấn luyện mô hình AI mượt mà.',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
      href: '/products?category=laptop',
    },
    {
      badge: 'Sang Trọng',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      icon: Zap,
      title: 'Dell XPS 13 OLED Touch',
      promo: 'Tặng chuột không dây Master 3S 2.2Tr',
      desc: 'Màn hình cảm ứng vô cực 3.5K OLED, thiết kế nhôm nguyên khối siêu mỏng nhẹ chỉ 1.19kg.',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
      href: '/products?category=laptop',
    },
    {
      badge: 'Gaming Đỉnh Cao',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      icon: Tag,
      title: 'ASUS ROG Zephyrus G14',
      promo: 'Tặng balo ROG Ranger + Tai nghe gaming',
      desc: 'Chip AMD Ryzen 9, card đồ họa RTX 4070 và màn hình Nebula Display 165Hz chuẩn thi đấu eSports.',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80',
      href: '/products?category=laptop',
    },
    {
      badge: 'Chuẩn Doanh Nhân',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      icon: Gift,
      title: 'Lenovo ThinkPad X1 Carbon',
      promo: 'Bảo hành tận nơi Premier Support 3 năm',
      desc: 'Bền bỉ chuẩn quân đội MIL-STD-810H, bàn phím gõ êm ái số 1 thế giới và tính năng bảo mật vân tay tối ưu.',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
      href: '/products?category=laptop',
    },
  ],
};

export default function LatestDeals() {
  const [activeTab, setActiveTab] = useState('all');
  const items = DEAL_CARDS[activeTab] || DEAL_CARDS.all;

  return (
    <section className="py-10">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Ưu đãi mới nhất
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600">
          Các chương trình khuyến mãi độc quyền và trợ giá lên đời tốt nhất hôm nay
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8">
        <div className="flex items-center gap-6 overflow-x-auto pb-3 pr-10 sm:pr-0 border-b border-neutral-200/80 dark:border-neutral-800 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] sm:[mask-image:none]">
          {DEAL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 text-sm font-bold transition-colors relative shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeDealTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Uniform 4-Card Grid: All 4 cards have consistent, rich, balanced framing */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {items.map((item, idx) => {
            const BadgeIcon = item.icon || Tag;
            return (
              <Link
                key={idx}
                href={item.href}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                {/* 1. Top Image Showcase */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-950 flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-contain filter drop-shadow-lg"
                  />
                  {/* Badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-md text-xs font-bold flex items-center gap-1.5 border ${item.badgeColor}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {item.badge}
                  </div>
                </div>

                {/* 2. Middle Body: Title, Promo & Description */}
                <div className="p-6 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-neutral-900 dark:text-white mb-1.5 leading-snug group-hover:text-brand-blue transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2">
                      {item.promo}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {/* 3. Bottom Action Footer */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white group-hover:text-brand-blue transition-colors">
                    <span>Khám phá ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
