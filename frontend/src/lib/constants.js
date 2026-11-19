/**
 * Navigation categories & Mega-Menu configurations
 */
export const NAV_ITEMS = [
  {
    id: 'store',
    label: 'Cửa Hàng',
    href: '/products',
    featured: [
      {
        title: 'Sản Phẩm Mới Nhất',
        desc: 'Galaxy S26 Ultra & Z Fold8',
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80',
        href: '/products',
        tag: 'Mới',
      },
      {
        title: 'Khuyến Mãi Flagship',
        desc: 'Giảm tới 8.000.000đ khi thu cũ đổi mới',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&q=80',
        href: '/products?sort=-price',
        tag: 'Hot',
      },
      {
        title: 'Laptop & Tablet Pro',
        desc: 'Hiệu năng đỉnh cao AI Ready',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
        href: '/products?category=laptop',
        tag: 'Bán chạy',
      },
    ],
    sections: [
      {
        title: 'Ưu Đãi Mới Nhất',
        links: [
          { label: 'Chương trình Thu cũ Đổi mới', href: '/products' },
          { label: 'Gói Bảo Hành VIP Care+', href: '/products' },
          { label: 'Ưu Đãi HSSV & Giáo Dục', href: '/products' },
          { label: 'Mã Giảm Giá Độc Quyền', href: '/products' },
        ],
      },
      {
        title: 'Khám Phá Công Nghệ',
        links: [
          { label: 'Hệ Sinh Thái Galaxy AI', href: '/products' },
          { label: 'Phụ Kiện Chính Hãng', href: '/products?category=phu-kien' },
          { label: 'Trải Nghiệm Tại Cửa Hàng', href: '/products' },
        ],
      },
    ],
  },
  {
    id: 'phone',
    label: 'Điện Thoại',
    href: '/products?category=dien-thoai',
    featured: [
      {
        title: 'Galaxy S26 Ultra',
        desc: 'Quyền năng Galaxy AI thế hệ mới',
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80',
        href: '/products?category=dien-thoai&brand=Samsung',
        tag: 'Flagship',
      },
      {
        title: 'iPhone 18 Pro Max',
        desc: 'Khung Titan chuẩn mực dẫn đầu',
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&q=80',
        href: '/products?category=dien-thoai&brand=Apple',
        tag: 'Mới',
      },
    ],
    sections: [
      {
        title: 'Dòng Galaxy',
        links: [
          { label: 'Galaxy S Series (Ultra, Plus)', href: '/products?category=dien-thoai&brand=Samsung' },
          { label: 'Galaxy Z Series (Fold & Flip)', href: '/products?category=dien-thoai&brand=Samsung' },
          { label: 'Galaxy A Series (Phổ thông)', href: '/products?category=dien-thoai&brand=Samsung' },
        ],
      },
      {
        title: 'Thương Hiệu Hàng Đầu',
        links: [
          { label: 'Apple iPhone', href: '/products?category=dien-thoai&brand=Apple' },
          { label: 'Samsung Galaxy', href: '/products?category=dien-thoai&brand=Samsung' },
          { label: 'Xiaomi / Android cao cấp', href: '/products?category=dien-thoai' },
        ],
      },
    ],
  },
  {
    id: 'laptop',
    label: 'Laptop & Tablet',
    href: '/products?category=laptop',
    featured: [
      {
        title: 'MacBook Pro M-Series',
        desc: 'Sức mạnh đồ họa vượt tầm',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
        href: '/products?category=laptop',
        tag: 'Pro',
      },
      {
        title: 'Galaxy Tab S Ultra',
        desc: 'Màn hình Dynamic AMOLED sắc nét',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
        href: '/products?category=tablet',
        tag: 'Hot',
      },
    ],
    sections: [
      {
        title: 'Máy Tính Bảng',
        links: [
          { label: 'iPad Pro / iPad Air', href: '/products?category=tablet' },
          { label: 'Galaxy Tab Series', href: '/products?category=tablet' },
          { label: 'Bút Cảm Ứng & Bàn Phím', href: '/products?category=phu-kien' },
        ],
      },
      {
        title: 'Laptop Cao Cấp',
        links: [
          { label: 'MacBook Air & Pro', href: '/products?category=laptop' },
          { label: 'Laptop Windows AI Mỏng Nhẹ', href: '/products?category=laptop' },
          { label: 'Laptop Đồ Họa & Gaming', href: '/products?category=laptop' },
        ],
      },
    ],
  },
  {
    id: 'wearables',
    label: 'Thiết Bị Đeo',
    href: '/products?category=thiet-bi-deo',
    featured: [
      {
        title: 'Galaxy Watch Ultra',
        desc: 'Đo lường thể lực chuẩn vận động viên',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
        href: '/products?category=thiet-bi-deo',
        tag: 'Mới',
      },
      {
        title: 'Tai Nghe Chống Ồn Buds Pro',
        desc: 'Âm thanh vòm 360 độ Hi-Res',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
        href: '/products?category=thiet-bi-deo',
        tag: 'Bán chạy',
      },
    ],
    sections: [
      {
        title: 'Đồng Hồ Thông Minh',
        links: [
          { label: 'Smartwatch Thể Thao', href: '/products?category=thiet-bi-deo' },
          { label: 'Smartwatch Thời Trang', href: '/products?category=thiet-bi-deo' },
          { label: 'Dây Đeo & Phụ Kiện Sạc', href: '/products?category=phu-kien' },
        ],
      },
      {
        title: 'Âm Thanh Di Động',
        links: [
          { label: 'Tai Nghe True Wireless', href: '/products?category=thiet-bi-deo' },
          { label: 'Tai Nghe Chụp Tai Noise Cancelling', href: '/products?category=thiet-bi-deo' },
          { label: 'Loa Bluetooth Kháng Nước', href: '/products?category=phu-kien' },
        ],
      },
    ],
  },
  {
    id: 'accessories',
    label: 'Phụ Kiện',
    href: '/products?category=phu-kien',
    featured: [
      {
        title: 'Bộ Sạc Nhanh GaN 65W',
        desc: 'Sạc 3 thiết bị cùng lúc siêu tốc',
        image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80',
        href: '/products?category=phu-kien',
        tag: 'Hot',
      },
    ],
    sections: [
      {
        title: 'Phụ Kiện Điện Thoại',
        links: [
          { label: 'Ốp Lưng Chống Sốc', href: '/products?category=phu-kien' },
          { label: 'Kính Cường Lực Bảo Vệ', href: '/products?category=phu-kien' },
          { label: 'Sạc Không Dây MagSafe', href: '/products?category=phu-kien' },
        ],
      },
      {
        title: 'Cáp & Kết Nối',
        links: [
          { label: 'Cáp Type-C Thunderbolt', href: '/products?category=phu-kien' },
          { label: 'Hub Chuyển Đổi Đa Năng', href: '/products?category=phu-kien' },
          { label: 'Pin Dự Phòng Dung Lượng Cao', href: '/products?category=phu-kien' },
        ],
      },
    ],
  },
];
