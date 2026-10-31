import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Promotion } from '../src/models/Promotion.js';
import { slugify } from '../src/lib/slugify.js';

const CATALOG = {
  'Điện thoại': [
    ['iPhone 15 Pro 256GB', 'Apple', 28_990_000, { Màn_hình: '6.1 inch OLED', Chip: 'A17 Pro', RAM: '8GB' }],
    ['iPhone 15 128GB', 'Apple', 19_990_000, { Màn_hình: '6.1 inch OLED', Chip: 'A16', RAM: '6GB' }],
    ['Galaxy S24 Ultra', 'Samsung', 29_990_000, { Màn_hình: '6.8 inch AMOLED', Chip: 'Snapdragon 8 Gen 3', RAM: '12GB' }],
    ['Xiaomi 14', 'Xiaomi', 17_990_000, { Màn_hình: '6.36 inch AMOLED', Chip: 'Snapdragon 8 Gen 3', RAM: '12GB' }],
  ],
  Laptop: [
    ['MacBook Air M3 13"', 'Apple', 27_990_000, { CPU: 'Apple M3', RAM: '16GB', SSD: '512GB' }],
    ['Dell XPS 13', 'Dell', 32_990_000, { CPU: 'Core Ultra 7', RAM: '16GB', SSD: '512GB' }],
    ['ASUS ROG Zephyrus G14', 'ASUS', 42_990_000, { CPU: 'Ryzen 9', RAM: '32GB', SSD: '1TB' }],
    ['Lenovo ThinkPad X1 Carbon', 'Lenovo', 38_990_000, { CPU: 'Core Ultra 7', RAM: '16GB', SSD: '512GB' }],
  ],
  'Phụ kiện': [
    ['Tai nghe AirPods Pro 2', 'Apple', 5_490_000, { Kết_nối: 'Bluetooth 5.3', Chống_ồn: 'Có' }],
    ['Sạc nhanh Anker 65W', 'Anker', 790_000, { Công_suất: '65W', Cổng: '2 USB-C, 1 USB-A' }],
    ['Chuột Logitech MX Master 3S', 'Logitech', 2_290_000, { Kết_nối: 'Bluetooth / USB receiver' }],
    ['Bàn phím cơ Keychron K2', 'Keychron', 2_190_000, { Layout: '75%', Switch: 'Gateron Brown' }],
  ],
};

await connectDb();

// Dev-only demo account; override the password with ADMIN_PASSWORD.
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin12345';
await User.updateOne(
  { email: 'admin@shop.local' },
  { $setOnInsert: { email: 'admin@shop.local', passwordHash: await bcrypt.hash(adminPassword, 10), fullName: 'Quản trị viên', role: 'admin' } },
  { upsert: true },
);

for (const [catName, products] of Object.entries(CATALOG)) {
  const cat = await Category.findOneAndUpdate(
    { slug: slugify(catName) },
    { $setOnInsert: { name: catName, slug: slugify(catName) } },
    { upsert: true, returnDocument: 'after' },
  );
  for (const [name, brand, price, specs] of products) {
    await Product.updateOne(
      { slug: slugify(name) },
      {
        $setOnInsert: {
          name, slug: slugify(name), categoryId: cat._id, brand, price, stock: 20,
          description: `${name} chính hãng, bảo hành 12 tháng.`,
          specs: Object.fromEntries(Object.entries(specs).map(([k, v]) => [k.replaceAll('_', ' '), v])),
        },
      },
      { upsert: true },
    );
  }
}

await Promotion.updateOne(
  { code: 'WELCOME10' },
  { $setOnInsert: { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 1_000_000, maxUses: 1000,
      startsAt: new Date(), endsAt: new Date(Date.now() + 365 * 86_400_000) } },
  { upsert: true },
);

console.log('Seeded: admin@shop.local, 3 categories, 12 products, promo WELCOME10');
await disconnectDb();
