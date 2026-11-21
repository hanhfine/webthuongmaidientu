'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

const GUEST_CART_KEY = 'techstore_guest_cart_v1';

function readGuestItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestItems(items) {
  if (typeof window === 'undefined') return;
  try {
    if (!items || items.length === 0) {
      window.localStorage.removeItem(GUEST_CART_KEY);
    } else {
      window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage quota / private-mode errors
  }
}

function buildGuestCart(rawItems) {
  const items = rawItems.map((entry) => {
    const stockNum = typeof entry.stock === 'number' ? entry.stock : 99;
    const quantity = Math.max(1, Number(entry.quantity) || 1);
    const price = Number(entry.price) || 0;
    const available = stockNum > 0 && quantity <= stockNum;
    return {
      productId: entry.productId,
      slug: entry.slug || '',
      name: entry.name || 'Sản phẩm',
      price,
      image: entry.image || '',
      images: Array.isArray(entry.images) ? entry.images : [],
      imageId: entry.imageId || null,
      stock: entry.stock,
      quantity,
      available,
      lineTotal: price * quantity,
    };
  });
  const subtotal = items.reduce((sum, it) => (it.available ? sum + it.lineTotal : sum), 0);
  return { items, subtotal };
}

const DEFAULT_CONFIG = {
  shippingFee: 30000,
  bank: {
    name: 'Vietcombank',
    account: '0123456789',
    holder: 'CUA HANG CONG NGHE',
  },
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [storeConfig, setStoreConfig] = useState(DEFAULT_CONFIG);
  const syncingGuestRef = useRef(false);

  // Load public store config (shippingFee, bank) once
  useEffect(() => {
    let active = true;
    api
      .get('/api/config')
      .then((cfg) => {
        if (active && cfg && typeof cfg.shippingFee === 'number') {
          setStoreConfig({
            shippingFee: cfg.shippingFee,
            bank: cfg.bank || DEFAULT_CONFIG.bank,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Re-validate applied promo whenever subtotal or cart contents change
  const syncPromoWithCart = useCallback(async (nextCart, promoOverride) => {
    const activePromo = promoOverride !== undefined ? promoOverride : appliedPromo;
    if (!activePromo) return;
    if (!nextCart?.items?.length || !nextCart?.subtotal) {
      setAppliedPromo(null);
      return;
    }
    try {
      const res = await api.post('/api/promotions/validate', { code: activePromo.code });
      setAppliedPromo({ code: res.code, discount: res.discount });
    } catch {
      setAppliedPromo(null);
    }
  }, [appliedPromo]);

  // Refresh cart from backend (or localStorage for guests, syncing automatically after login)
  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(buildGuestCart(readGuestItems()));
      setAppliedPromo(null);
      return;
    }
    if (!isCustomer) {
      setCart({ items: [], subtotal: 0 });
      setAppliedPromo(null);
      return;
    }

    setLoading(true);
    try {
      const guestItems = readGuestItems();
      if (guestItems.length > 0 && !syncingGuestRef.current) {
        syncingGuestRef.current = true;
        writeGuestItems([]);
        try {
          for (const item of guestItems) {
            try {
              await api.post('/api/cart/items', {
                productId: item.productId,
                quantity: item.quantity,
              });
            } catch {
              // Skip unavailable or out-of-stock guest items cleanly
            }
          }
        } finally {
          syncingGuestRef.current = false;
        }
      }

      const data = await api.get('/api/cart');
      const nextCart = data || { items: [], subtotal: 0 };
      setCart(nextCart);
      if (nextCart.items.length === 0) {
        setAppliedPromo(null);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isCustomer]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add item to cart (authenticated API for customers, localStorage for guests)
  const addToCart = async (productId, quantity = 1, productMeta = null) => {
    if (user && !isCustomer) {
      throw new Error('Tài khoản quản trị viên không thể mua hàng');
    }
    if (user && isCustomer) {
      const data = await api.post('/api/cart/items', { productId, quantity });
      setCart(data);
      await syncPromoWithCart(data);
      return data;
    }

    const meta = productMeta || (await api.get(`/api/products/${productId}`));
    if ((meta?.stock ?? 0) <= 0) {
      throw new Error('Sản phẩm hiện đã hết hàng');
    }

    const raw = readGuestItems();
    const pid = String(meta?._id || productId);
    const existing = raw.find((x) => String(x.productId) === pid);
    const nextQty = (existing?.quantity || 0) + quantity;
    if (typeof meta.stock === 'number' && nextQty > meta.stock) {
      throw new Error(`Chỉ còn ${meta.stock} sản phẩm trong kho`);
    }

    const updatedEntry = {
      productId: pid,
      slug: meta.slug || existing?.slug || '',
      name: meta.name || existing?.name || 'Sản phẩm',
      price: meta.price ?? existing?.price ?? 0,
      image: meta.image || existing?.image || '',
      images: meta.images || existing?.images || [],
      imageId: meta.imageId ?? existing?.imageId ?? null,
      stock: meta.stock,
      quantity: nextQty,
    };

    const nextRaw = existing
      ? raw.map((x) => (String(x.productId) === pid ? updatedEntry : x))
      : [...raw, updatedEntry];

    writeGuestItems(nextRaw);
    const nextCart = buildGuestCart(nextRaw);
    setCart(nextCart);
    return nextCart;
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    if (!user) {
      const raw = readGuestItems();
      const target = raw.find((x) => String(x.productId) === String(productId));
      if (!target) return cart;
      if (quantity <= 0) {
        return removeFromCart(productId);
      }
      if (typeof target.stock === 'number' && quantity > target.stock) {
        throw new Error(`Chỉ còn ${target.stock} sản phẩm trong kho`);
      }
      const nextRaw = raw.map((x) =>
        String(x.productId) === String(productId) ? { ...x, quantity } : x
      );
      writeGuestItems(nextRaw);
      const nextCart = buildGuestCart(nextRaw);
      setCart(nextCart);
      return nextCart;
    }

    if (!isCustomer) return;
    const data = await api.patch(`/api/cart/items/${productId}`, { quantity });
    setCart(data);
    await syncPromoWithCart(data);
    return data;
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    if (!user) {
      const nextRaw = readGuestItems().filter((x) => String(x.productId) !== String(productId));
      writeGuestItems(nextRaw);
      const nextCart = buildGuestCart(nextRaw);
      setCart(nextCart);
      return nextCart;
    }

    if (!isCustomer) return;
    const data = await api.delete(`/api/cart/items/${productId}`);
    setCart(data);
    await syncPromoWithCart(data);
    return data;
  };

  const applyPromo = useCallback((promo) => setAppliedPromo(promo), []);
  const removePromo = useCallback(() => setAppliedPromo(null), []);

  const cartCount = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const value = {
    cart,
    cartCount,
    subtotal: cart.subtotal || 0,
    loading,
    appliedPromo,
    applyPromo,
    removePromo,
    storeConfig,
    addToCart,
    updateQuantity,
    removeFromCart,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
