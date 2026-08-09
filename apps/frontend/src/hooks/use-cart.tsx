import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  mergeCart,
} from '@/lib/api'
import type { Product } from '@/types'

const SHIPPING_FLAT_RATE = 350

export function useCart() {
  const queryClient = useQueryClient()

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
  })

  const items = data?.items ?? []
  const subtotal = data?.subtotal ?? 0
  // Shipping is a flat rate computed client-side — the backend doesn't
  // calculate it, since it's a display-only estimate, not something
  // charged/persisted anywhere yet.
  const shipping = items.length > 0 ? SHIPPING_FLAT_RATE : 0
  const total = subtotal + shipping

  const addMutation = useMutation({
    mutationFn: ({
      product,
      quantity,
      size,
    }: {
      product: Product
      quantity: number
      size: string | null
    }) => addToCart(product.id, quantity, size),
    onSuccess: (cart) => queryClient.setQueryData(['cart'], cart),
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(['cart'], cart),
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => removeCartItem(itemId),
    onSuccess: (cart) => queryClient.setQueryData(['cart'], cart),
  })

  const addItem = useCallback(
    (product: Product, quantity = 1, size: string | null = null) => {
      addMutation.mutate({ product, quantity, size })
    },
    [addMutation],
  )

  const updateQuantity = useCallback(
    (itemId: number, quantity: number) => {
      // Dropping to 0 or below removes the line entirely, rather than
      // sending an invalid quantity the backend's min:1 rule would reject.
      if (quantity < 1) {
        removeMutation.mutate(itemId)
        return
      }
      updateMutation.mutate({ itemId, quantity })
    },
    [updateMutation, removeMutation],
  )

  const removeItem = useCallback(
    (itemId: number) => removeMutation.mutate(itemId),
    [removeMutation],
  )

  const clear = useCallback(() => {
    // The backend already clears the cart server-side as part of
    // checkout (see OrderController::store) — there's no separate
    // "clear cart" endpoint to call. This just resets the LOCAL cache to
    // match what the server already did.
    queryClient.setQueryData(['cart'], { id: null, items: [], subtotal: 0 })
  }, [queryClient])

  // Call this right after login/register succeeds — merges whatever the
  // guest accumulated into the now-authenticated user's real cart.
  const merge = useCallback(async () => {
    const cart = await mergeCart()
    queryClient.setQueryData(['cart'], cart)
  }, [queryClient])

  return {
    items,
    subtotal,
    shipping,
    total,
    isLoading,
    hydrated: isFetched,
    addItem,
    updateQuantity,
    removeItem,
    clear,
    merge,
  }
}
