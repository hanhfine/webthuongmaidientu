import crypto from 'node:crypto';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Image } from '../models/Image.js';
import { AppError } from '../lib/errors.js';
import { slugify } from '../lib/slugify.js';
import { toObjectId } from '../lib/ids.js';
import { EXTENDED_TECH_CATALOG } from '../lib/extendedTechCatalog.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
};

export async function search(query, { includeInactive = false } = {}) {
  const { q, category, brand, minPrice, maxPrice, sort, page, pageSize } = query;
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: re }, { brand: re }];
  }
  if (category) {
    if (/^[0-9a-f]{24}$/i.test(category)) {
      filter.categoryId = toObjectId(category);
    } else {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) {
        filter.categoryId = cat._id;
      } else {
        return { items: [], products: [], total: 0, totalPages: 1, page, pageSize };
      }
    }
  }
  if (brand) filter.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Product.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(total / pageSize) || 1;
  return { items, products: items, total, totalPages, page, pageSize };
}

export async function getById(idOrSlug, { includeInactive = false } = {}) {
  let product = null;
  if (typeof idOrSlug === 'string' && /^[0-9a-f]{24}$/i.test(idOrSlug)) {
    product = await Product.findById(toObjectId(idOrSlug)).lean();
  }
  if (!product) {
    product = await Product.findOne({ slug: idOrSlug }).lean();
  }
  if (!product || (!includeInactive && !product.isActive)) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  }
  return product;
}

export async function listBrands() {
  const brands = await Product.distinct('brand', { isActive: true });
  return brands.sort((a, b) => a.localeCompare(b));
}

async function assertCategory(categoryId) {
  const valid = /^[0-9a-f]{24}$/i.test(categoryId);
  if (!valid || !(await Category.exists({ _id: categoryId }))) {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại');
  }
}

async function assertImage(imageId) {
  if (imageId && !(await Image.exists({ _id: imageId }))) {
    throw new AppError(400, 'IMAGE_NOT_FOUND', 'Ảnh không tồn tại');
  }
}

export async function create(data) {
  await assertCategory(data.categoryId);
  await assertImage(data.imageId);
  const slug = `${slugify(data.name)}-${crypto.randomBytes(3).toString('hex')}`;
  return Product.create({ ...data, slug });
}

export async function update(id, data) {
  if (data.categoryId) await assertCategory(data.categoryId);
  await assertImage(data.imageId);
  const patch = { ...data };
  if (data.name) patch.slug = `${slugify(data.name)}-${crypto.randomBytes(3).toString('hex')}`;
  const product = await Product.findByIdAndUpdate(toObjectId(id), patch, { returnDocument: 'after' });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  return product;
}

export async function archive(id) {
  await update(id, { isActive: false });
}

const FAKE_STORE_ELECTRONICS_URL = 'https://fakestoreapi.com/products/category/electronics';

// Snapshot from https://github.com/keikaavousi/fake-store-api (electronics category)
// Used as fallback when offline or if fakestoreapi.com times out
export const FAKE_STORE_ELECTRONICS_SNAPSHOT = [
  {
    id: 9,
    title: 'WD 2TB Elements Portable External Hard Drive - USB 3.0 ',
    price: 64,
    description:
      'USB 3.0 and USB 2.0 Compatibility Fast data transfers Improve PC Performance High Capacity; Compatibility Formatted NTFS for Windows 10, Windows 8.1, Windows 7; Reformatting may be required for other operating systems; Compatibility may vary depending on user’s hardware configuration and operating system',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/61IBBVJvSDL._AC_SY879_t.png',
    rating: { rate: 3.3, count: 203 },
  },
  {
    id: 10,
    title: 'SanDisk SSD PLUS 1TB Internal SSD - SATA III 6 Gb/s',
    price: 109,
    description:
      'Easy upgrade for faster boot up, shutdown, application load and response (As compared to 5400 RPM SATA 2.5” hard drive; Based on published specifications and internal benchmarking tests using PCMark vantage scores) Boosts burst write performance, making it ideal for typical PC workloads The perfect balance of performance and reliability Read/write speeds of up to 535MB/s/450MB/s (Based on internal testing; Performance may vary depending upon drive capacity, host device, OS and application.)',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/61U7T1koQqL._AC_SX679_t.png',
    rating: { rate: 2.9, count: 470 },
  },
  {
    id: 11,
    title: 'Silicon Power 256GB SSD 3D NAND A55 SLC Cache Performance Boost SATA III 2.5',
    price: 109,
    description:
      '3D NAND flash are applied to deliver high transfer speeds Remarkable transfer speeds that enable faster bootup and improved overall system performance. The advanced SLC Cache Technology allows performance boost and longer lifespan 7mm slim design suitable for Ultrabooks and Ultra-slim notebooks. Supports TRIM command, Garbage Collection technology, RAID, and ECC (Error Checking & Correction) to provide the optimized performance and enhanced reliability.',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/71kWymZ+c+L._AC_SX679_t.png',
    rating: { rate: 4.8, count: 319 },
  },
  {
    id: 12,
    title: 'WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive',
    price: 114,
    description:
      "Expand your PS4 gaming experience, Play anywhere Fast and easy, setup Sleek design with high capacity, 3-year manufacturer's limited warranty",
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/61mtL65D4cL._AC_SX679_t.png',
    rating: { rate: 4.8, count: 400 },
  },
  {
    id: 13,
    title: 'Acer SB220Q bi 21.5 inches Full HD (1920 x 1080) IPS Ultra-Thin',
    price: 599,
    description:
      '21. 5 inches Full HD (1920 x 1080) widescreen IPS display And Radeon free Sync technology. No compatibility for VESA Mount Refresh Rate: 75Hz - Using HDMI port Zero-frame design | ultra-thin | 4ms response time | IPS panel Aspect ratio - 16: 9. Color Supported - 16. 7 million colors. Brightness - 250 nit Tilt angle -5 degree to 15 degree. Horizontal viewing angle-178 degree. Vertical viewing angle-178 degree 75 hertz',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/81QpkIctqPL._AC_SX679_t.png',
    rating: { rate: 2.9, count: 250 },
  },
  {
    id: 14,
    title: 'Samsung 49-Inch CHG90 144Hz Curved Gaming Monitor (LC49HG90DMNXZA) – Super Ultrawide Screen QLED ',
    price: 999.99,
    description:
      '49 INCH SUPER ULTRAWIDE 32:9 CURVED GAMING MONITOR with dual 27 inch screen side by side QUANTUM DOT (QLED) TECHNOLOGY, HDR support and factory calibration provides stunningly realistic and accurate color and contrast 144HZ HIGH REFRESH RATE and 1ms ultra fast response time work to eliminate motion blur, ghosting, and reduce input lag',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_t.png',
    rating: { rate: 2.2, count: 140 },
  },
];

function parseFakeStoreTechProduct(raw) {
  const title = String(raw.title || '').trim();
  const lower = title.toLowerCase();

  let brand = 'Tech';
  if (lower.startsWith('wd ') || lower.includes('western digital')) brand = 'WD';
  else if (lower.includes('sandisk')) brand = 'SanDisk';
  else if (lower.includes('silicon power')) brand = 'Silicon Power';
  else if (lower.includes('acer')) brand = 'Acer';
  else if (lower.includes('samsung')) brand = 'Samsung';
  else if (lower.includes('apple')) brand = 'Apple';
  else if (lower.includes('sony')) brand = 'Sony';
  else {
    const firstWord = title.split(/\s+/)[0];
    if (firstWord) brand = firstWord;
  }

  const isDisplayOrCompute =
    lower.includes('monitor') ||
    lower.includes('inches') ||
    lower.includes('inch') ||
    lower.includes('display') ||
    lower.includes('qled') ||
    lower.includes('ips') ||
    lower.includes('laptop');

  const targetCategoryName = isDisplayOrCompute ? 'Laptop' : 'Phụ kiện';

  const specs = { 'Nguồn dữ liệu': 'Fake Store API (electronics)' };
  if (isDisplayOrCompute) {
    if (lower.includes('49-inch') || lower.includes('49 inch')) {
      specs['Màn hình'] = '49 inch Super Ultrawide 32:9 QLED';
      specs['Tần số quét'] = '144Hz (1ms)';
    } else if (lower.includes('21.5')) {
      specs['Màn hình'] = '21.5 inch Full HD (1920 x 1080) IPS';
      specs['Tần số quét'] = '75Hz (4ms)';
    }
  } else {
    const capMatch = title.match(/\b(\d+\s*(?:TB|GB))\b/i);
    if (capMatch) specs['Dung lượng'] = capMatch[1].toUpperCase();
    if (lower.includes('sata iii')) specs['Chuẩn kết nối'] = 'SATA III 6 Gb/s (2.5")';
    else if (lower.includes('usb 3.0')) specs['Chuẩn kết nối'] = 'USB 3.0 / USB 2.0';
    else if (lower.includes('playstation')) specs['Tương thích'] = 'PlayStation 4 / PC USB 3.0';
  }

  // Convert USD price to VND integer rounded to 10,000 VND (1 USD ≈ 25,000 VND)
  const usdPrice = Number(raw.price) || 50;
  const vndPrice = Math.max(100_000, Math.round((usdPrice * 25_000) / 10_000) * 10_000);

  return {
    externalId: Number(raw.id) || null,
    externalSource: 'fakestoreapi',
    name: title,
    slug: slugify(title),
    brand,
    targetCategoryName,
    price: vndPrice,
    stock: 25,
    description: String(raw.description || '').trim(),
    image: raw.image || null,
    images: raw.image ? [raw.image] : [],
    ratingAvg: Number(raw.rating?.rate) || 4.5,
    ratingCount: Number(raw.rating?.count) || 10,
    specs,
  };
}

const DUMMYJSON_TECH_CATEGORIES = [
  { slug: 'smartphones', targetCategoryName: 'Điện thoại', label: 'Smartphone' },
  { slug: 'laptops', targetCategoryName: 'Laptop', label: 'Laptop' },
  { slug: 'tablets', targetCategoryName: 'Laptop', label: 'Máy tính bảng (Tablet)' },
  { slug: 'mobile-accessories', targetCategoryName: 'Phụ kiện', label: 'Phụ kiện công nghệ' },
];

export const DUMMYJSON_TECH_SNAPSHOT = [
  {
    id: 123,
    title: 'iPhone 13 Pro',
    description: 'The iPhone 13 Pro is a cutting-edge smartphone with a powerful camera system, high-performance chip, and stunning display.',
    category: 'smartphones',
    price: 1099.99,
    rating: 4.12,
    stock: 56,
    brand: 'Apple',
    sku: 'SMA-APP-IPH-123',
    warrantyInformation: '3 year warranty',
    images: [
      'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/1.webp',
      'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/2.webp',
      'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/3.webp',
    ],
    thumbnail: 'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/thumbnail.webp',
  },
  {
    id: 78,
    title: 'Apple MacBook Pro 14 Inch Space Grey',
    description: 'The MacBook Pro 14 Inch in Space Grey is a powerful and sleek laptop, featuring Apple M1 Pro chip for exceptional performance and a stunning Retina display.',
    category: 'laptops',
    price: 1999.99,
    rating: 4.65,
    stock: 24,
    brand: 'Apple',
    sku: 'LAP-APP-MAC-078',
    warrantyInformation: '1 year warranty',
    images: [
      'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/1.webp',
      'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/2.webp',
      'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/3.webp',
    ],
    thumbnail: 'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp',
  },
  {
    id: 160,
    title: 'Samsung Galaxy Tab S8 Plus Grey',
    description: 'The Samsung Galaxy Tab S8 Plus in Grey is a high-performance Android tablet with a large AMOLED display and S-Pen support.',
    category: 'tablets',
    price: 599.99,
    rating: 4.43,
    stock: 30,
    brand: 'Samsung',
    sku: 'TAB-SAM-GAL-160',
    warrantyInformation: '2 year warranty',
    images: [
      'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/1.webp',
      'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/2.webp',
    ],
    thumbnail: 'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/thumbnail.webp',
  },
  {
    id: 101,
    title: 'Apple AirPods Max Silver',
    description: 'The Apple AirPods Max in Silver arekani over-ear wireless headphones with Active Noise Cancellation and Spatial Audio.',
    category: 'mobile-accessories',
    price: 549.99,
    rating: 4.55,
    stock: 18,
    brand: 'Apple',
    sku: 'ACC-APP-AIR-101',
    warrantyInformation: '1 year warranty',
    images: ['https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp'],
    thumbnail: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp',
  },
];

function parseDummyJsonTechProduct(raw, catMeta) {
  const title = String(raw.title || '').trim();
  const brand = String(raw.brand || title.split(/\s+/)[0] || 'Tech').trim();
  const gallery = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images.filter(Boolean) : [];
  const primaryImage = gallery[0] || raw.thumbnail || null;

  const specs = {
    'Nguồn dữ liệu': `DummyJSON API (${raw.category || catMeta.slug})`,
    'Phân loại': catMeta.label,
  };
  if (raw.sku) specs['Mã SKU'] = String(raw.sku);
  if (raw.warrantyInformation) specs['Bảo hành'] = String(raw.warrantyInformation);
  if (raw.weight) specs['Trọng lượng'] = `${raw.weight}00g`;

  const usdPrice = Number(raw.price) || 50;
  const vndPrice = Math.max(100_000, Math.round((usdPrice * 25_000) / 10_000) * 10_000);
  const reviewCount = Array.isArray(raw.reviews) && raw.reviews.length > 0 ? raw.reviews.length * 15 : 25;

  return {
    externalId: Number(raw.id) || null,
    externalSource: 'dummyjson',
    name: title,
    slug: slugify(title),
    brand,
    targetCategoryName: catMeta.targetCategoryName,
    price: vndPrice,
    stock: Math.max(5, Number(raw.stock) || 20),
    description: String(raw.description || '').trim(),
    image: primaryImage,
    images: gallery.length > 0 ? gallery : primaryImage ? [primaryImage] : [],
    ratingAvg: Number(Number(raw.rating || 4.5).toFixed(1)),
    ratingCount: reviewCount,
    specs,
  };
}

function parseExtendedCatalogProduct(item) {
  const title = String(item.title || '').trim();
  const gallery = Array.isArray(item.images) && item.images.length > 0 ? item.images : item.image ? [item.image] : [];
  return {
    externalId: Number(item.id) || null,
    externalSource: 'fakestore-extended',
    name: title,
    slug: slugify(title),
    brand: String(item.brand || 'Tech').trim(),
    targetCategoryName: item.category || 'Phụ kiện',
    price: Number(item.price) || 1_000_000,
    stock: 25,
    description: String(item.description || '').trim(),
    image: item.image || gallery[0] || null,
    images: gallery,
    ratingAvg: Number(item.rating?.rate) || 4.8,
    ratingCount: Number(item.rating?.count) || 120,
    specs: {
      'Nguồn dữ liệu': 'Fake Store Extended Tech API',
      ...(item.specs || {}),
    },
  };
}

export async function syncFromFakeStoreApi({
  fetchImpl = globalThis.fetch,
  includeDummyJson = true,
  includeExtendedCatalog = true,
} = {}) {
  let fakeStoreRaw = null;
  let fakeStoreSource = 'live';

  if (typeof fetchImpl === 'function') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetchImpl(FAKE_STORE_ELECTRONICS_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          fakeStoreRaw = json;
        }
      }
    } catch {
      // Fallback to snapshot from keikaavousi/fake-store-api repo
    }
  }

  if (!fakeStoreRaw) {
    fakeStoreRaw = FAKE_STORE_ELECTRONICS_SNAPSHOT;
    fakeStoreSource = 'snapshot';
  }

  const parsedProducts = fakeStoreRaw.map((raw) => parseFakeStoreTechProduct(raw));

  let dummyJsonCount = 0;
  if (includeDummyJson) {
    const dummyParsed = [];
    if (typeof fetchImpl === 'function') {
      try {
        const responses = await Promise.all(
          DUMMYJSON_TECH_CATEGORIES.map(async (catMeta) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 7000);
            const res = await fetchImpl(`https://dummyjson.com/products/category/${catMeta.slug}`, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            });
            clearTimeout(timeout);
            if (!res.ok) return [];
            const data = await res.json();
            const list = Array.isArray(data?.products) ? data.products : [];
            return list.map((item) => parseDummyJsonTechProduct(item, catMeta));
          }),
        );
        for (const group of responses) {
          dummyParsed.push(...group);
        }
      } catch {
        // Fallback to DummyJSON snapshot if offline
      }
    }

    if (dummyParsed.length === 0) {
      for (const raw of DUMMYJSON_TECH_SNAPSHOT) {
        const catMeta =
          DUMMYJSON_TECH_CATEGORIES.find((c) => c.slug === raw.category) || DUMMYJSON_TECH_CATEGORIES[0];
        dummyParsed.push(parseDummyJsonTechProduct(raw, catMeta));
      }
    }

    dummyJsonCount = dummyParsed.length;
    parsedProducts.push(...dummyParsed);
  }

  let extendedCount = 0;
  if (includeExtendedCatalog) {
    const extParsed = EXTENDED_TECH_CATALOG.map((item) => parseExtendedCatalogProduct(item));
    extendedCount = extParsed.length;
    parsedProducts.push(...extParsed);
  }

  const categoryMap = new Map();
  for (const catName of ['Điện thoại', 'Laptop', 'Phụ kiện']) {
    const cat = await Category.findOneAndUpdate(
      { slug: slugify(catName) },
      { $setOnInsert: { name: catName, slug: slugify(catName) } },
      { upsert: true, returnDocument: 'after' },
    );
    categoryMap.set(catName, cat._id);
  }

  const syncedItems = [];
  for (const parsed of parsedProducts) {
    const categoryId = categoryMap.get(parsed.targetCategoryName);

    const doc = await Product.findOneAndUpdate(
      { slug: parsed.slug },
      {
        $set: {
          name: parsed.name,
          categoryId,
          brand: parsed.brand,
          price: parsed.price,
          description: parsed.description,
          image: parsed.image,
          images: parsed.images,
          externalId: parsed.externalId,
          externalSource: parsed.externalSource,
          specs: parsed.specs,
          ratingAvg: parsed.ratingAvg,
          ratingCount: parsed.ratingCount,
          isActive: true,
        },
        $setOnInsert: {
          slug: parsed.slug,
          stock: parsed.stock,
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();

    syncedItems.push(doc);
  }

  return {
    syncedCount: syncedItems.length,
    fakeStoreCount: fakeStoreRaw.length,
    dummyJsonCount,
    extendedCount,
    source: fakeStoreSource,
    items: syncedItems,
  };
}
