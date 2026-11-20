export default function ProductSpecs({ specs, brand = '' }) {
  // Fallback specs if none provided
  const displaySpecs = specs && Object.keys(specs).length > 0 
    ? specs 
    : {
        'Kích thước màn hình': '6.8 inch, Dynamic AMOLED 2X, 120Hz',
        'Độ phân giải': 'QHD+ (3120 x 1440 Pixels)',
        'Hệ điều hành': 'Android 16 / One UI 8.0',
        'Vi xử lý (CPU)': `${brand || 'Flagship'} AI Core Octa-core 3.4 GHz`,
        'Bộ nhớ RAM': '12 GB / 16 GB LPDDR5X',
        'Bộ nhớ trong': '256 GB / 512 GB / 1 TB UFS 4.0',
        'Camera sau': 'Chính 200 MP + Góc siêu rộng 50 MP + Tele 50 MP (Zoom 100x)',
        'Camera trước': '12 MP Dual Pixel AI',
        'Dung lượng pin': '5.000 mAh, Sạc siêu nhanh 45W, Sạc không dây',
        'Chất liệu khung viền': 'Titanium Grade 5 siêu bền',
        'Chuẩn kháng nước': 'IP68 (ngâm nước 1.5m trong 30 phút)',
        'Trọng lượng': '232 g',
      };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
        Thông số kỹ thuật chi tiết
      </h3>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
        {Object.entries(displaySpecs).map(([key, value], idx) => (
          <div
            key={idx}
            className={`grid grid-cols-1 sm:grid-cols-3 py-3.5 px-4 rounded-xl ${
              idx % 2 === 0 ? 'bg-neutral-50/60 dark:bg-neutral-800/30' : ''
            }`}
          >
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
              {key}
            </span>
            <span className="sm:col-span-2 text-neutral-900 dark:text-neutral-100 mt-1 sm:mt-0 font-medium">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
