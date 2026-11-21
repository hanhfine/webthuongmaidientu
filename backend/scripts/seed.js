import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Promotion } from '../src/models/Promotion.js';
import { slugify } from '../src/lib/slugify.js';
import { syncFromFakeStoreApi } from '../src/services/productService.js';

const LEGACY_PRODUCT_SLUGS = [
  'iphone-15-pro-256gb',
  'iphone-15-128gb',
  'galaxy-s24-ultra',
  'xiaomi-14',
  'macbook-air-m3-13',
  'dell-xps-13',
  'asus-rog-zephyrus-g14',
  'lenovo-thinkpad-x1-carbon',
  'tai-nghe-airpods-pro-2',
  'sac-nhanh-anker-65w',
  'chuot-logitech-mx-master-3s',
  'ban-phim-co-keychron-k2',
].map(slugify);

await connectDb();

// Dev-only demo account; override the password with ADMIN_PASSWORD.
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin12345';
await User.updateOne(
  { email: 'admin@shop.local' },
  { $setOnInsert: { email: 'admin@shop.local', passwordHash: await bcrypt.hash(adminPassword, 10), fullName: 'Quản trị viên', role: 'admin' } },
  { upsert: true },
);

// Remove legacy hardcoded sample products
await Product.deleteMany({
  $or: [
    { slug: { $in: LEGACY_PRODUCT_SLUGS } },
    { externalSource: null, imageId: null },
  ],
});

await Promotion.updateOne(
  { code: 'WELCOME10' },
  { $setOnInsert: { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 1_000_000, maxUses: 1000,
      startsAt: new Date(), endsAt: new Date(Date.now() + 365 * 86_400_000) } },
  { upsert: true },
);

const fakeStoreSync = await syncFromFakeStoreApi();
console.log(
  `Seeded: admin@shop.local, 3 categories, ${fakeStoreSync.syncedCount} tech products (Fake Store API: ${fakeStoreSync.fakeStoreCount}, DummyJSON: ${fakeStoreSync.dummyJsonCount}, Extended Tech Catalog: ${fakeStoreSync.extendedCount}), promo WELCOME10`,
);
await disconnectDb();
