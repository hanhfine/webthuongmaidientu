'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  RotateCcw, 
  Sparkles, 
  Tag, 
  Check, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

// Banner configs by category (TopZone style as in Image 2)
const CATEGORY_TOPZONE_BANNERS = {
  'dien-thoai': {
    brandLogo: ' iPhone & Flagship Store',
    heroTitle: 'iPhone 16 Pro & Galaxy S24 Ultra',
    heroTag: 'Sắm Như Ý. Trả Nhẹ Ví',
    heroImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=700&q=85',
    badges: ['Giá mới chỉ từ 24.990.000 ₫', 'Chỉ từ 59K/ngày', 'Trả chậm 0% lãi suất'],
    subText: 'Tặng PMH đến 1.000.000 ₫ khi mua MacBook, Apple Watch, AirPods • Thu cũ trợ giá đến 2.000.000 ₫',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'iPhone 16 Series', value: 'iPhone 16' },
      { label: 'iPhone 15 Series', value: 'iPhone 15' },
      { label: 'Galaxy S24 Series', value: 'Galaxy S24' },
      { label: 'Galaxy Z Fold & Flip', value: 'Galaxy Z' },
      { label: 'Xiaomi 14 Series', value: 'Xiaomi' },
    ],
    storageOptions: ['128GB', '256GB', '512GB', '1TB', '2TB'],
  },
  laptop: {
    brandLogo: '💻 MacBook & Laptop Premium',
    heroTitle: 'MacBook Pro M3 & Dell XPS 13',
    heroTag: 'Hiệu Năng Đỉnh Cao. Thiết Kế Tinh Tế',
    heroImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=85',
    badges: ['Giảm ngay tới 4.000.000 ₫', 'Trả chậm 0% qua thẻ', 'Tặng Balo + Chuột Master 3S'],
    subText: 'Trợ giá lên đời máy mới tới 3.000.000 ₫ • Miễn phí cài đặt ứng dụng & vệ sinh trọn đời máy',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'MacBook Pro', value: 'MacBook Pro' },
      { label: 'MacBook Air', value: 'MacBook Air' },
      { label: 'Dell XPS', value: 'Dell' },
      { label: 'ASUS ROG', value: 'ASUS' },
      { label: 'Lenovo ThinkPad', value: 'ThinkPad' },
    ],
    storageOptions: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'],
  },
  'phu-kien': {
    brandLogo: '🎧 Phụ Kiện Âm Thanh & Công Nghệ',
    heroTitle: 'AirPods Pro 2 & Sạc Nhanh GaN 65W',
    heroTag: 'Chính Hãng 100%. Bảo Hành 1 Đổi 1',
    heroImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&q=85',
    badges: ['Giảm tới 40% khi mua kèm máy', 'Tặng bao da chống sốc', 'Đổi trả miễn phí 30 ngày'],
    subText: 'Hệ sinh thái kết nối không dây tiện lợi • Âm thanh không gian Spatial Audio sống động',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'Tai nghe AirPods & Buds', value: 'AirPods' },
      { label: 'Sạc cáp Anker GaN', value: 'Anker' },
      { label: 'Chuột & Phím Logitech', value: 'Logitech' },
      { label: 'Bàn phím Keychron', value: 'Keychron' },
    ],
    storageOptions: [],
  },
};

const SORT_ITEMS = [
  { label: 'Nổi bật', value: '' },
  { label: 'Bán chạy', value: '-ratingAvg' },
  { label: 'Giảm giá', value: 'price' },
  { label: 'Mới', value: '-createdAt' },
  { label: 'Giá tăng dần', value: 'price' },
  { label: 'Giá giảm dần', value: '-price' },
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

  const banner = CATEGORY_TOPZONE_BANNERS[categorySlug] || CATEGORY_TOPZONE_BANNERS['dien-thoai'];

  const [activeSeries, setActiveSeries] = useState('');
  const [selectedStorageMap, setSelectedStorageMap] = useState({});
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [bannerSlide, setBannerSlide] = useState(0);

  // Filter products by selected series
  const displayedProducts = useMemo(() => {
    if (!activeSeries) return products;
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(activeSeries.toLowerCase());
      const matchBrand = p.brand?.toLowerCase().includes(activeSeries.toLowerCase());
      return matchName || matchBrand;
    });
  }, [products, activeSeries]);

  const handleSelectStorage = (productId, storage) => {
    setSelectedStorageMap((prev) => ({ ...prev, [productId]: storage }));
  };

  return (
    <div className="space-y-8 text-neutral-100">
      {/* 1. Centered Category Title / Logo (như Ảnh 2) */}
      <div className="text-center pt-2 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          {banner.brandLogo}
        </h1>
      </div>

      {/* 2. TopZone Style Hero Banner Carousel (như Ảnh 2) */}
      <div className="relative rounded-3xl overflow-hidden bg-[#f5f5f7] text-neutral-900 shadow-2xl p-6 sm:p-10 border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left: Product Name & Multi-color Lineup Showcase */}
          <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-950">
              {banner.heroTitle}
            </h2>
            <div className="relative w-full max-w-sm aspect-[4/3] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.heroImage}
                alt={banner.heroTitle}
                className="w-full h-full object-contain filter drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Right: Slogan & Red Promotion Badges (như Ảnh 2) */}
          <div className="md:col-span-7 flex flex-col justify-center items-center md:items-end text-center md:text-right space-y-4">
            <span className="text-2xl sm:text-4xl font-black text-rose-600 tracking-tight">
              {banner.heroTag}
            </span>

            {/* 3 Red Promo Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 pt-2">
              {banner.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/30"
                >
                  {badge}
                </span>
              ))}
            </div>

            <p className="text-xs text-neutral-600 max-w-lg leading-relaxed pt-2">
              {banner.subText}
            </p>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        <button
          onClick={() => setBannerSlide((prev) => (prev > 0 ? prev - 1 : 1))}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all"
          aria-label="Previous banner"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setBannerSlide((prev) => (prev < 1 ? prev + 1 : 0))}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all"
          aria-label="Next banner"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <span className="w-2 h-2 rounded-full bg-neutral-900" />
          <span className="w-2 h-2 rounded-full bg-neutral-400" />
          <span className="w-2 h-2 rounded-full bg-neutral-300" />
        </div>
      </div>

      {/* 3. Horizontal Filter Pills Bar (TopZone style: [ ∇ Lọc ] + Series Pills) (như Ảnh 2) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
        {/* Filter Button [ ∇ Lọc ] */}
        <button
          onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border ${
            filterDrawerOpen || currentMinPrice || currentMaxPrice || currentBrand
              ? 'bg-brand-blue text-white border-brand-blue shadow-md'
              : 'bg-[#2c2c2e] text-neutral-200 border-neutral-700 hover:border-neutral-500'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Lọc
          {(currentMinPrice || currentMaxPrice || currentBrand) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Series Pills (iPhone 16 Series, iPhone 15 Series, v.v.) */}
        {banner.seriesPills.map((sp) => {
          const isSelected = activeSeries === sp.value;
          return (
            <button
              key={sp.label}
              onClick={() => setActiveSeries(isSelected ? '' : sp.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
                isSelected
                  ? 'bg-white text-neutral-950 border-white shadow-md'
                  : 'bg-[#2c2c2e] text-neutral-300 border-neutral-700/80 hover:border-neutral-500 hover:text-white'
              }`}
            >
              {sp.label}
            </button>
          );
        })}
      </div>

      {/* Expandable Quick Filter Drawer when clicking [ ∇ Lọc ] */}
      {filterDrawerOpen && (
        <div className="p-5 rounded-3xl bg-[#28282a] border border-neutral-700/80 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
              Bộ lọc nâng cao theo mức giá & thương hiệu
            </span>
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price Filter */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Khoảng giá
              </label>
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
                className="w-full bg-[#1e1e20] text-xs font-semibold text-white px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Tất cả mức giá</option>
                <option value="0-10000000">Dưới 10 Triệu</option>
                <option value="10000000-20000000">Từ 10 - 20 Triệu</option>
                <option value="20000000-30000000">Từ 20 - 30 Triệu</option>
                <option value="30000000-">Trên 30 Triệu</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Hãng sản xuất
              </label>
              <select
                value={currentBrand}
                onChange={(e) => updateFilters({ brand: e.target.value })}
                className="w-full bg-[#1e1e20] text-xs font-semibold text-white px-3.5 py-2.5 rounded-xl border border-neutral-700 focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Tất cả thương hiệu</option>
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Xiaomi">Xiaomi</option>
                <option value="Dell">Dell</option>
                <option value="ASUS">ASUS</option>
                <option value="Lenovo">Lenovo</option>
              </select>
            </div>

            {/* Reset button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setActiveSeries('');
                  resetFilters();
                  setFilterDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-neutral-700/60 hover:bg-neutral-700 text-xs font-bold text-white rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Sort Options Row (TopZone style: Sắp xếp theo: Nổi bật • Bán chạy • Giảm giá • Mới • Giá) (như Ảnh 2) */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium">Sắp xếp theo:</span>
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar">
            {SORT_ITEMS.map((item) => {
              const isActive = currentSort === item.value;
              return (
                <button
                  key={item.label}
                  onClick={() => updateFilters({ sort: item.value })}
                  className={`font-semibold transition-colors ${
                    isActive
                      ? 'text-white font-bold underline underline-offset-4 decoration-2 decoration-brand-blue'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-neutral-500 font-medium">
          {displayedProducts.length} sản phẩm
        </span>
      </div>

      {/* 5. TopZone Dark Product Cards Grid (3 Columns as in Image 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProducts.map((p) => {
          const selectedStorage = selectedStorageMap[p._id] || (banner.storageOptions[0] || '256GB');
          const monthlyEst = Math.round(p.price / 12);

          return (
            <div
              key={p._id}
              className="p-6 rounded-3xl bg-[#28282a] border border-neutral-700/60 shadow-lg flex flex-col justify-between hover:border-neutral-500 hover:bg-[#2d2d30] transition-all group"
            >
              <div>
                {/* Top: Orange 'Mới' Badge (như Ảnh 2) */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-400 border border-amber-500/80 bg-amber-500/10">
                    Mới
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Chính Hãng VN/A
                  </span>
                </div>

                {/* Product Image Cutout (như Ảnh 2) */}
                <Link href={`/products/${p.slug}`} className="block relative aspect-square w-full mb-6 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80'}
                    alt={p.name}
                    className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Storage Pills Selector Row: [ 256GB ] [ 512GB ] [ 1TB ] [ 2TB ] (như Ảnh 2) */}
                {banner.storageOptions.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-5 overflow-x-auto no-scrollbar py-1">
                    {banner.storageOptions.map((st) => {
                      const isChosen = selectedStorage === st;
                      return (
                        <button
                          key={st}
                          onClick={() => handleSelectStorage(p._id, st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isChosen
                              ? 'bg-neutral-100 text-neutral-900 border-white shadow-sm'
                              : 'bg-[#1e1e20] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Product Name & Rating */}
                <Link href={`/products/${p.slug}`}>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                    {p.name}
                  </h3>
                </Link>

                {/* Price & Monthly Installment */}
                <div className="mb-4">
                  <p className="text-xl sm:text-2xl font-black text-white">
                    {formatVND(p.price)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Trả góp từ {formatVND(monthlyEst)}/tháng • 0% lãi suất
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-700/80 space-y-2.5">
                <button
                  onClick={async () => {
                    await addToCart(p._id, 1);
                    showToast(`Đã thêm ${p.name} (${selectedStorage}) vào giỏ hàng!`, 'success');
                  }}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Mua Ngay
                </button>
                <Link
                  href={`/products/${p.slug}`}
                  className="w-full py-2.5 rounded-2xl border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white text-xs font-bold transition-all text-center block"
                >
                  Xem Chi Tiết
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
