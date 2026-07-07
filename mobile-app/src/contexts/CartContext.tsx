import React, { createContext, useContext, useState, ReactNode } from 'react';

// Infos produit minimales conservées dans le panier (pour l'afficher sans
// refaire d'appel API).
export interface CartProduct {
  id: number;
  name: string;
  price: number | string;
  currency: string;
  imageUrl?: string;
}

export interface CartLine {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartLine[];
  itemCount: number;
  total: number;
  addItem: (product: CartProduct) => void;
  decrement: (productId: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Record<number, CartLine>>({});

  const addItem = (product: CartProduct) => {
    setLines((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: { product, quantity: (existing?.quantity || 0) + 1 },
      };
    });
  };

  const decrement = (productId: number) => {
    setLines((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const quantity = existing.quantity - 1;
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = { ...existing, quantity };
      }
      return next;
    });
  };

  const removeItem = (productId: number) => {
    setLines((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clear = () => setLines({});

  const items = Object.values(lines);
  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const total = items.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, total, addItem, decrement, removeItem, clear }}
    >
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
