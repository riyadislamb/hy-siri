import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  promoCode?: string;
  discountAmount?: number;
  appliedDiscount?: number;
  points?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  applyPromoCode: (code: string) => boolean;
  clearCart: () => void;
  total: number;
  subtotal: number;
  totalDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (newItem: CartItem) => {
    setItems(current => {
      const existing = current.find(item => item.id === newItem.id);
      if (existing) {
        return current.map(item =>
          item.id === newItem.id ? { ...item, quantity: item.quantity + newItem.quantity } : item
        );
      }
      return [...current, newItem];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const applyPromoCode = (code: string) => {
    let applied = false;
    setItems(current => 
      current.map(item => {
        if (item.promoCode && item.promoCode.toLowerCase() === code.toLowerCase() && item.discountAmount) {
          applied = true;
          return { ...item, appliedDiscount: item.discountAmount };
        }
        return item;
      })
    );
    return applied;
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.appliedDiscount || 0) * item.quantity, 0);
  const total = subtotal - totalDiscount;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, applyPromoCode, clearCart, total, subtotal, totalDiscount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
