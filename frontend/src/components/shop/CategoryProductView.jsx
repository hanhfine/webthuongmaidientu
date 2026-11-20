'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  SlidersHorizontal, 
  ChevronDown, 
  Star, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  Bookmark, 
  ArrowRight,
  Check
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

// Sub-categories with thumbnail icons per main category
const CATEGORY_META = {
  'dien-thoai': {
    title: 'Khám phá Điện thoại Flagship',
    bannerTitle: 'Nâng tầm trải nghiệm thông minh — Đón ưu đãi cực đỉnh',
    bannerSub: 'Sự kiện Flagship Livestream độc quyền: Giảm tới 8 Triệu + Tặng gói bảo hành VIP Care+',
    subPills: [
      { label: 'Điện thoại Galaxy', slug: 'dien-thoai', img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=120&q=80' },
      { label: 'Galaxy Tab', slug: 'laptop', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=120&q=80' },
      { label: 'Galaxy Watch', slug: 'thiet-bi-deo', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80' },
      { label: 'Galaxy Buds', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=120&q=80' },
      { label: 'Galaxy Ring', slug: 'thiet-bi-deo', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=120&q=80' },
      { label: 'Phụ kiện Galaxy', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=120&q=80' },
    ],
    series: [
      { label: 'Tất cả', value: '' },
      { label: 'Galaxy S', value: 'Galaxy S' },
      { label: 'Galaxy Z', value: 'Galaxy Z' },
      { label: 'Galaxy A', value: 'Galaxy A' },
      { label: 'iPhone 15 Series', value: 'iPhone' },
      { label: 'Xiaomi Flagship', value: 'Xiaomi' },
    ],
    storageOptions: ['128 GB', '256 GB', '512 GB', '1 TB'],
    screenOptions: ['Dưới 6.1 inch', '6.1 - 6.7 inch', 'Trên 6.7 inch'],
    featureOptions: ['Galaxy AI', 'Kết nối 5G', 'Kháng nước IP68', 'Sạc siêu nhanh 45W'],
  },
  laptop: {
    title: 'Khám phá Laptop & Máy Tính Bảng',
    bannerTitle: 'Sức mạnh đồ họa đỉnh cao — Hiệu năng vượt giới hạn',
    bannerSub: 'Trang bị chip Apple M3 / Core Ultra 7 thế hệ mới, tối ưu cho lập trình & sáng tạo nội dung.',
    subPills: [
      { label: 'MacBook Pro & Air', slug: 'laptop', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=120&q=80' },
      { label: 'Dell XPS & Gaming', slug: 'laptop', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=120&q=80' },
      { label: 'ASUS ROG Zephyrus', slug: 'laptop', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=120&q=80' },
      { label: 'Lenovo ThinkPad', slug: 'laptop', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=120&q=80' },
      { label: 'Bàn phím & Chuột IT', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=120&q=80' },
    ],
    series: [
      { label: 'Tất cả', value: '' },
      { label: 'MacBook', value: 'MacBook' },
      { label: 'Dell XPS', value: 'Dell' },
      { label: 'ASUS ROG', value: 'ASUS' },
      { label: 'ThinkPad', value: 'ThinkPad' },
    ],
    storageOptions: ['256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB SSD'],
    screenOptions: ['13.3 - 14 inch', '15.6 - 16 inch'],
    featureOptions: ['Màn hình OLED', 'RAM 16GB+', 'Card đồ họa rời', 'Thời lượng pin 18h'],
  },
  'phu-kien': {
    title: 'Khám phá Phụ Kiện Chính Hãng',
    bannerTitle: 'Hệ sinh thái kết nối không dây hoàn hảo',
    bannerSub: 'Tai nghe chống ồn chủ động, sạc nhanh công suất lớn và phụ kiện bảo vệ cao cấp.',
    subPills: [
      { label: 'Tai nghe AirPods & Buds', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=120&q=80' },
      { label: 'Củ sạc GaN 65W', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=120&q=80' },
      { label: 'Chuột & Bàn phím cơ', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=120&q=80' },
      { label: 'Bao da & Ốp lưng', slug: 'phu-kien', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=120&q=80' },
    ],
    series: [
      { label: 'Tất cả', value: '' },
      { label: 'Apple Original', value: 'Apple' },
      { label: 'Anker GaN', value: 'Anker' },
      { label: 'Logitech Master', value: 'Logitech' },
      { label: 'Keychron Cơ', value: 'Keychron' },
    ],
    storageOptions: [],
    screenOptions: [],
    featureOptions: ['Chống ồn chủ động', 'Sạc không dây Qi2', 'Bluetooth 5.3', 'Đa thiết bị'],
  },
};

const PRICE_TIERS = [
  { label: 'Khoảng giá', min: '', max: '' },
  { label: 'Dưới 10 Triệu', min: '0', max: '10000000' },
  { label: 'Từ 10 - 20 Triệu', min: '10000000', max: '20000000' },
  { label: 'Từ 20 - 30 Triệu', min: '20000000', max: '30000000' },
  { label: 'Trên 30 Triệu', min: '30000000', max: '' },
];

export default function CategoryProductView({
  categorySlug,
  products = [],
  total = 0,
  currentSort = '',
  currentBrand = '',
  currentMinPrice = '',
  currentMaxPrice = '',
  updateFilters,
  resetFilters,
}) {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const meta = CATEGORY_META[categorySlug] || CATEGORY_META['dien-thoai'];

  // Local state for specific hardware filters
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedScreen, setSelectedScreen] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [savedPromos, setSavedPromos] = useState({});

  // Filter products by hardware specs if selected
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Series filter
      if (selectedSeries && !p.name.toLowerCase().includes(selectedSeries.toLowerCase()) && p.brand !== selectedSeries) {
        return false;
      }
      // 2. Storage filter
      if (selectedStorage) {
        const specsText = JSON.stringify(p.specs || {}).toLowerCase() + ' ' + p.name.toLowerCase();
        const cleanTerm = selectedStorage.replace(/\s+/g, '').toLowerCase();
        if (!specsText.includes(cleanTerm) && !specsText.includes(selectedStorage.toLowerCase())) {
          return false;
        }
      }
      // 3. Screen filter
      if (selectedScreen && p.specs) {
        const screenSpec = (p.specs['Màn hình'] || p.specs['Màn_hình'] || p.specs['CPU'] || '').toLowerCase();
        if (selectedScreen.includes('Dưới 6.1') && !screenSpec.includes('6.1')) return true;
      }
      return true;
    });
  }, [products, selectedSeries, selectedStorage, selectedScreen]);

  const handleSavePromo = (code, e) => {
    e.preventDefault();
    setSavedPromos((prev) => ({ ...prev, [code]: true }));
    showToast(`Đã lưu mã giảm giá ${code} vào giỏ hàng!`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* 1. Category Promo Banner (Samsung Live Shop style from image 4) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white p-6 sm:p-10 shadow-xl border border-blue-900/40">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Đặc Quyền Mua Sắm Trực Tuyến
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
            {meta.bannerTitle}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mb-6 leading-relaxed">
            {meta.bannerSub}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              ⚡ Flash Sale Trực Tiếp: 17:45 - 21:45
            </div>
            <Link
              href="/cart"
              className="px-6 py-2.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white font-bold transition-all shadow-md"
            >
              Nhận Voucher Giảm Thêm
            </Link>
          </div>
        </div>

        {/* Ambient background orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Sub-category Pills with Circular Thumbnail Image (Ảnh 4) */}
      <div className="pt-2">
        <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mb-6">
          {meta.title}
        </h3>

        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
          {meta.subPills.map((sub, i) => {
            const isSelected = sub.slug === categorySlug && i === 0;
            return (
              <Link
                key={i}
                href={`/products?category=${sub.slug}`}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 shrink-0 min-w-[110px] text-center ${
                  isSelected
                    ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300'
                }`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 p-1 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sub.img} alt={sub.label} className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                  {sub.label}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Cánh tay đắc lực AI</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Series Pills (Dòng sản phẩm cụ thể như Ảnh 4) */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {meta.series.map((s) => {
          const isSelected = selectedSeries === s.value;
          return (
            <button
              key={s.label}
              onClick={() => setSelectedSeries(isSelected ? '' : s.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
                isSelected
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 4. Deep Category-specific Filter Bar (Ảnh 4) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        {/* Top filter header: Count & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-white font-bold">
              <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
              Bộ lọc chuyên ngành
            </span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-500">
              {filteredProducts.length} Kết quả
            </span>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Sắp xếp:</span>
            <select
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 border-none cursor-pointer focus:ring-0 pr-4"
            >
              <option value="">Theo Khuyến Nghị</option>
              <option value="price">Giá: Thấp đến Cao</option>
              <option value="-price">Giá: Cao đến Thấp</option>
              <option value="-ratingAvg">Đánh giá cao nhất</option>
              <option value="-createdAt">Mới nhất</option>
            </select>
          </div>
        </div>

        {/* Filter dropdown pills row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Storage Filter */}
          {meta.storageOptions.length > 0 && (
            <div className="relative">
              <select
                value={selectedStorage}
                onChange={(e) => setSelectedStorage(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                <option value="">Bộ nhớ</option>
                {meta.storageOptions.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
          )}

          {/* Price Range Filter */}
          <div className="relative">
            <select
              value={
                currentMinPrice && currentMaxPrice
                  ? `${currentMinPrice}-${currentMaxPrice}`
                  : currentMinPrice
                  ? `${currentMinPrice}-`
                  : currentMaxPrice
                  ? `0-${currentMaxPrice}`
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  updateFilters({ minPrice: '', maxPrice: '' });
                } else {
                  const [min, max] = val.split('-');
                  updateFilters({ minPrice: min, maxPrice: max });
                }
              }}
              className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
            >
              <option value="">Khoảng Giá</option>
              {PRICE_TIERS.slice(1).map((tier, i) => (
                <option key={i} value={`${tier.min}-${tier.max}`}>{tier.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
          </div>

          {/* Screen Size Filter */}
          {meta.screenOptions.length > 0 && (
            <div className="relative">
              <select
                value={selectedScreen}
                onChange={(e) => setSelectedScreen(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                <option value="">Kích Thước Màn Hình</option>
                {meta.screenOptions.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
          )}

          {/* Feature Filter */}
          {meta.featureOptions.length > 0 && (
            <div className="relative">
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-bold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                <option value="">Tính Năng Nổi Bật</option>
                {meta.featureOptions.map((ft) => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
          )}

          {/* Reset Filters button */}
          {(selectedSeries || selectedStorage || selectedScreen || selectedFeature || currentMinPrice || currentMaxPrice) && (
            <button
              onClick={() => {
                setSelectedSeries('');
                setSelectedStorage('');
                setSelectedScreen('');
                setSelectedFeature('');
                resetFilters();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 5. Samsung Detailed Product Cards Grid (Ảnh 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => {
          const monthlyEst = Math.round(p.price / 12);
          const hasSaved = Boolean(savedPromos['WELCOME10']);

          return (
            <div
              key={p._id}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all group"
            >
              <div>
                {/* Promo Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60">
                    ShopeePay giảm 5%
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    Chính hãng 100%
                  </span>
                </div>

                {/* Product Image */}
                <Link href={`/products/${p.slug}`} className="block relative aspect-square w-full mb-6 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80'}
                    alt={p.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 filter drop-shadow-md"
                  />
                </Link>

                {/* Product Name & Rating */}
                <Link href={`/products/${p.slug}`}>
                  <h4 className="text-base font-black text-neutral-900 dark:text-white mb-2 leading-snug group-hover:text-brand-blue transition-colors line-clamp-2">
                    {p.name}
                  </h4>
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {p.ratingAvg ? p.ratingAvg.toFixed(1) : '4.9'}
                  </span>
                  <span>({p.ratingCount || 120})</span>
                </div>

                {/* Color dots swatches */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-4 h-4 rounded-full bg-slate-800 ring-2 ring-neutral-300 dark:ring-neutral-600 cursor-pointer" />
                  <span className="w-4 h-4 rounded-full bg-indigo-200 cursor-pointer" />
                  <span className="w-4 h-4 rounded-full bg-neutral-200 cursor-pointer" />
                  <span className="text-[11px] text-neutral-400 ml-1">Xanh Titan</span>
                </div>

                {/* Storage Pills Selector */}
                <div className="flex items-center gap-2 mb-6">
                  {['128 GB', '256 GB', '512 GB'].map((st, idx) => (
                    <button
                      key={st}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        idx === 1
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Price & Installment estimate */}
                <div className="mb-4">
                  <p className="text-xs text-neutral-500 font-medium">
                    Từ {formatVND(monthlyEst)}/tháng hoặc
                  </p>
                  <p className="text-xl font-black text-neutral-900 dark:text-white">
                    {formatVND(p.price)}
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                    Chiết khấu tới 1.500.000 VND (khi áp mã voucher)
                  </p>
                </div>

                {/* Flash sale coupon input with Save button (Ảnh 4) */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-brand-blue" />
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold">Nhập mã voucher</span>
                      <p className="text-xs font-bold text-brand-blue">WELCOME10</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleSavePromo('WELCOME10', e)}
                    disabled={hasSaved}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      hasSaved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-brand-blue text-white hover:bg-brand-blue-hover'
                    }`}
                  >
                    {hasSaved ? 'Đã Lưu' : 'Lưu'}
                  </button>
                </div>

                {/* Flash Sale Countdown clock (Ảnh 4: 10 : 06 : 01) */}
                <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 font-mono font-bold mb-5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>10 Ngày</span>
                  <span>:</span>
                  <span>06 Giờ</span>
                  <span>:</span>
                  <span>01 Phút</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={async () => {
                    await addToCart(p._id, 1);
                    showToast(`Đã thêm ${p.name} vào giỏ hàng!`, 'success');
                  }}
                  className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Mua Ngay
                </button>
                <Link
                  href={`/products/${p.slug}`}
                  className="w-full py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold transition-all text-center block"
                >
                  Tìm hiểu thêm
                </Link>

                {/* Compare Checkbox */}
                <label className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-neutral-400 cursor-pointer hover:text-neutral-600">
                  <input type="checkbox" className="rounded border-neutral-300 text-brand-blue focus:ring-0" />
                  So Sánh Thiết Bị
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
