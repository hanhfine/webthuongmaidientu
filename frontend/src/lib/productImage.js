const FALLBACK_IMAGES = {
  iphone: [
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=85',
    'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&q=85',
  ],
  samsung: [
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=85',
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=85',
  ],
  xiaomi: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=85',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=85',
  ],
  macbook: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=85',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=85',
  ],
  dell: [
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=85',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=85',
  ],
  laptop: [
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=85',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=85',
  ],
  keyboard: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=85',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=85',
  ],
  mouse: [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=85',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=85',
  ],
  audio: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=85',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=85',
  ],
  charger: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=85',
  ],
  default: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=85',
  ],
};

function getFallbackList(product) {
  const name = (product?.name || '').toLowerCase();
  const brand = (product?.brand || '').toLowerCase();

  if (name.includes('iphone') || (brand === 'apple' && !name.includes('macbook') && !name.includes('airpods'))) {
    return FALLBACK_IMAGES.iphone;
  }
  if (name.includes('s24') || name.includes('samsung') || name.includes('galaxy') || brand === 'samsung') {
    return FALLBACK_IMAGES.samsung;
  }
  if (name.includes('xiaomi') || brand === 'xiaomi') {
    return FALLBACK_IMAGES.xiaomi;
  }
  if (name.includes('macbook')) {
    return FALLBACK_IMAGES.macbook;
  }
  if (name.includes('dell') || name.includes('xps')) {
    return FALLBACK_IMAGES.dell;
  }
  if (name.includes('asus') || name.includes('rog') || name.includes('thinkpad') || name.includes('lenovo') || name.includes('laptop')) {
    return FALLBACK_IMAGES.laptop;
  }
  if (name.includes('phím') || name.includes('keychron') || name.includes('keyboard')) {
    return FALLBACK_IMAGES.keyboard;
  }
  if (name.includes('chuột') || name.includes('logitech') || name.includes('mouse')) {
    return FALLBACK_IMAGES.mouse;
  }
  if (name.includes('tai nghe') || name.includes('airpods') || name.includes('buds')) {
    return FALLBACK_IMAGES.audio;
  }
  if (name.includes('sạc') || name.includes('anker') || name.includes('cáp')) {
    return FALLBACK_IMAGES.charger;
  }
  return FALLBACK_IMAGES.default;
}

export function resolveProductImage(product) {
  if (!product) return FALLBACK_IMAGES.default[0];
  if (product.imageId) return `/api/images/${product.imageId}`;
  if (Array.isArray(product.images) && product.images[0]) return product.images[0];
  if (product.image) return product.image;
  return getFallbackList(product)[0];
}

export function resolveProductGallery(product) {
  if (!product) return FALLBACK_IMAGES.default;
  if (product.imageId) return [`/api/images/${product.imageId}`];
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter(Boolean);
  }
  if (product.image) return [product.image];
  return getFallbackList(product);
}
