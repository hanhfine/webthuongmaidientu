export default function ProductSpecs({ specs, brand = '' }) {
  // Use real product specs, or generic official specs if not specified
  const displaySpecs = specs && Object.keys(specs).length > 0 
    ? specs 
    : {
        'Thương hiệu': brand || 'Chính Hãng VN/A',
        'Tình trạng': 'Mới 100% nguyên seal',
        'Bảo hành': '12 tháng chính hãng toàn quốc',
        'Bộ sản phẩm gồm': 'Thân máy/thiết bị, phụ kiện kèm theo, sách hướng dẫn sử dụng',
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
