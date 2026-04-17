"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSession } from "@/lib/contexts/SessionContext";

export interface CartItem {
  id: string;
  sessionId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  allergens?: string[];
  image?: string | null;
  offer?: {
    discountPercent?: number;
  } | null;
  addedAt?: {
    seconds?: number;
  };
}

export function useCart() {
  const { activeSession } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const activeSessionId = activeSession?.id;

  useEffect(() => {
    if (!activeSessionId) {
      setItems([]);
      setLoadingCart(false);
      return;
    }

    setLoadingCart(true);
    const cartQuery = query(
      collection(db, "cartItems"),
      where("sessionId", "==", activeSessionId)
    );

    const unsubscribe = onSnapshot(
      cartQuery,
      (snapshot) => {
        const nextItems = snapshot.docs
          .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() } as CartItem))
          .sort((a, b) => (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0));

        setItems(nextItems);
        setLoadingCart(false);
      },
      () => {
        setItems([]);
        setLoadingCart(false);
      }
    );

    return () => unsubscribe();
  }, [activeSessionId]);

  const itemCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const savings = items.reduce((acc, item) => {
    const discountPercent = item.offer?.discountPercent || 0;
    return acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0) * discountPercent) / 100;
  }, 0);
  const total = Math.max(0, subtotal - savings);

  return {
    items,
    itemCount,
    subtotal,
    savings,
    total,
    loadingCart,
  };
}
