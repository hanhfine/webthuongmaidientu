'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);

  // Refresh cart from backend
  const refreshCart = useCallback(async () => {
    if (!user || !isCustomer) {
      setCart({ items: [], subtotal: 0 });
      return;
    }
    setLoading(true);
    try {
      const data = await api.get('/api/cart');
      setCart(data || { items: [], subtotal: 0 });
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isCustomer]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      throw new Error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
    }
    if (!isCustomer) {
      throw new Error('Tài khoản quản trị viên không thể mua hàng');
    }
    const data = await api.post('/api/cart/items', { productId, quantity });
    setCart(data);
    return data;
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    if (!user || !isCustomer) return;
    const data = await api.patch(`/api/cart/items/${productId}`, { quantity });
    setCart(data);
    return data;
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    if (!user || !isCustomer) return;
    const data = await api.delete(`/api/cart/items/${productId}`);
    setCart(data);
    return data;
  };

  const cartCount = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const value = {
    cart,
    cartCount,
    subtotal: cart.subtotal || 0,
    loading,
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
