import {createContext, useCallback, useContext, useEffect, useMemo, type ReactNode} from 'react'
import type {CartItem, Product} from "@/types"
import {usePersistedState} from './use-persisted-state'

const STORAGE_KEY = "kijani-cart-v2";
const LEGACY_KEY = "kijani-cart";
const SHIPPING_FLAT = 350;

interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  count:number;
  hydrated:boolean;
  addItem:(product:Product, quantity?:number, size?:string |null) => void
  updateQuantity:(id:string, quantity:number) => void
  removeItem:(id:string) => void
  clear:() => void
}

const CartContext = createContext<CartContextValue | null>(null)

function parseStored(raw:string|null):CartItem[]{
  if(!raw) return [];
  try{
    const  parsed = JSON.parse(raw) as unknown;
    if(!Array.isArray(parsed)) return [];
    return parsed.filter((i):i is CartItem => {
      const item = i as Partial<CartItem>;
      return !!item && typeof item.id === "string" && !!item.product && typeof item.quantity === "number";
    }).map((i) => ({
      id:i.id,
      product:i.product,
      quantity:Math.max(1, Math.round(i.quantity)),
      size:typeof i.size === "string" ?i.size:null
    }))
  }catch{
    return []
  }
}
export function CartProvider({children}: {children: ReactNode}) {
  const [items, setItems, hydrated] = usePersistedState(STORAGE_KEY, parseStored)

  // Legacy key migration: run once after hydration
  useEffect(() => {
    if (!hydrated) return
    if (items.length > 0) return
    const legacy = parseStored(window.localStorage.getItem(LEGACY_KEY))
    if (legacy.length) {
      setItems(legacy)
      window.localStorage.removeItem(LEGACY_KEY)
    }
  }, [hydrated])

  const addItem = useCallback((product: Product, quantity = 1, size: string | null = null) => {
    const id = `${product.id}-${size ?? "os"}`;
    setItems((current) =>
        current.some((i) => i.id === id)
            ? current.map((i) => (i.id === id ? { ...i, quantity: i.quantity + quantity } : i))
            : [...current, { id, product, quantity, size }],
    );
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) => current.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const shipping = items.length ? SHIPPING_FLAT : 0;
    return {
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      count: items.reduce((n, i) => n + i.quantity, 0),
      hydrated,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [items, hydrated, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
