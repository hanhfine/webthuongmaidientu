'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Tag } from 'lucide-react';

const DEAL_TABS = [
  { id: 'all', label: 'Mới' },
  { id: 'dien-thoai', label: 'Di động' },
  { id: 'tv', label: 'TV' },
  { id: 'gia-dung', label: 'Gia dụng' },
  { id: 'laptop', label: 'Màn hình máy tính' },
];

const DEAL_CONTENT = {
  all: {
    hero: {
      title: 'Mở rộng khung hình, mãn nhãn trên mọi hành trình',
      desc: 'Đắm chìm vào âm nhạc, ẩm thực hay nội dung du lịch sống động trên màn hình cực đại của Galaxy Z Fold8.',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85',
      href: '/products?category=dien-thoai',
    },
    items: [
      {
        name: 'Galaxy Z Fold8',
        promo: 'Ưu đãi giảm giá lên đến 5 Triệu',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&q=80',
        href: '/products?category=dien-thoai',
      },
      {
        name: 'Galaxy Z Fold8 Ultra',
        promo: 'Lên đời Galaxy Z Fold8 Ultra giảm đến 23.5 Triệu',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
        href: '/products?category=dien-thoai',
      },
      {
        name: 'Galaxy Tab S12+ 5G',
        promo: 'Ưu đãi giảm giá lên đến 2.5 Triệu',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
        href: '/products?category=laptop',
      },
    ],
  },
  'dien-thoai': {
    hero: {
      title: 'Galaxy S26 Ultra Quyền Năng Galaxy AI',
      desc: 'Camera 200MP đột phá, màn hình chống chói Dynamic AMOLED và chip xử lý tối tân nhất.',
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900&q=85',
      href: '/products?category=dien-thoai',
    },
    items: [
      {
        name: 'Galaxy S26 Ultra 512GB',
        promo: 'Thu cũ đổi mới trợ giá tới 8 Triệu',
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80',
        href: '/products?category=dien-thoai',
      },
      {
        name: 'Galaxy Z Flip8 Bespoke',
        promo: 'Tặng ốp lưng thời trang + Care+ 1 năm',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&q=80',
        href: '/products?category=dien-thoai',
      },
      {
        name: 'Galaxy A56 5G',
        promo: 'Giảm ngay 1.000.000đ khi mở thẻ',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80',
        href: '/products?category=dien-thoai',
      },
    ],
  },
  tv: {
    hero: {
      title: 'TV Neo QLED 8K - Đỉnh Cao Nghe Nhìn',
      desc: 'Công nghệ Quantum Matrix Pro và bộ xử lý NQ8 AI Gen3 tái hiện mọi chi tiết sống động.',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900&q=85',
      href: '/products?category=tv-av',
    },
    items: [
      {
        name: 'The Frame TV Khung Tranh 65"',
        promo: 'Tặng kèm khung viền nghệ thuật cao cấp',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80',
        href: '/products?category=tv-av',
      },
      {
        name: 'OLED 4K Vision 55"',
        promo: 'Tặng Loa Thanh Soundbar trị giá 4.9tr',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80',
        href: '/products?category=tv-av',
      },
      {
        name: 'Loa Thanh Q-Series Dolby Atmos',
        promo: 'Giảm 30% khi mua cùng TV',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&q=80',
        href: '/products?category=tv-av',
      },
    ],
  },
  'gia-dung': {
    hero: {
      title: 'Hệ Sinh Thái Gia Dụng Bespoke AI',
      desc: 'Tối ưu năng lượng, tự động hóa cuộc sống tiện nghi cho cả gia đình bạn.',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=900&q=85',
      href: '/products',
    },
    items: [
      {
        name: 'Tủ Lạnh Bespoke 4 Cửa',
        promo: 'Tặng lò vi sóng nướng trị giá 3.2tr',
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80',
        href: '/products',
      },
      {
        name: 'Máy Giặt Thông Minh AI EcoBubble',
        promo: 'Bảo hành động cơ Digital Inverter 20 năm',
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80',
        href: '/products',
      },
      {
        name: 'Máy Hút Bụi Jet Cordless AI',
        promo: 'Giảm trực tiếp 1.5 Triệu',
        image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80',
        href: '/products',
      },
    ],
  },
  laptop: {
    hero: {
      title: 'Galaxy Book & Màn Hình Gaming Odyssey',
      desc: 'Tần số quét 240Hz, độ trễ 0.03ms và sức mạnh đồ họa đỉnh cao.',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=85',
      href: '/products?category=laptop',
    },
    items: [
      {
        name: 'MacBook Pro M4 Max 36GB',
        promo: 'Giảm ngay 3.000.000đ cho lập trình viên',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
        href: '/products?category=laptop',
      },
      {
        name: 'Dell XPS 13 OLED Touch',
        promo: 'Tặng balo da + chuột cao cấp 2.2tr',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
        href: '/products?category=laptop',
      },
      {
        name: 'Màn Hình Đồ Họa 4K ViewFinity',
        promo: 'Cân màu chuẩn điện ảnh Calman Verified',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80',
        href: '/products?category=laptop',
      },
    ],
  },
};

export default function LatestDeals() {
  const [activeTab, setActiveTab] = useState('all');
  const activeContent = DEAL_CONTENT[activeTab] || DEAL_CONTENT.all;

  return (
    <section className="py-12">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Ưu đãi mới nhất
        </h2>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto pb-3 mb-8 border-b border-neutral-200/80 dark:border-neutral-800 no-scrollbar">
        {DEAL_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold transition-all relative shrink-0 ${
                isActive
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
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

      {/* Grid: 1 Big Story Card (Left) + 3 Product Deal Cards (Right) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Card 1: Big Story Highlight Banner */}
          <Link
            href={activeContent.hero.href}
            className="group rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex flex-col justify-between hover:shadow-lg transition-all border border-neutral-200/80 dark:border-neutral-800"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeContent.hero.image}
                alt={activeContent.hero.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-amber-400" />
                Featured Deal
              </div>
            </div>

            <div className="p-6 flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white mb-2 leading-snug group-hover:text-brand-blue transition-colors">
                  {activeContent.hero.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                  {activeContent.hero.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white group-hover:translate-x-1 transition-transform">
                Khám phá ưu đãi
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* Cards 2, 3, 4: Deal Product Cards */}
          {activeContent.items.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="group p-6 rounded-3xl bg-neutral-50/70 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
            >
              <div className="relative aspect-square w-full mb-4 flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 filter drop-shadow-md"
                />
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5 group-hover:text-brand-blue transition-colors">
                  {item.name}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
                  {item.promo}
                </p>
              </div>
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
