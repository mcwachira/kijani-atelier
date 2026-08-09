// Guests need a stable identifier BEFORE their first cart request — the
// backend's Cart.guest_token column is a native Postgres uuid, so this
// MUST stay a real UUID (crypto.randomUUID(), not a random string).
const CART_TOKEN_KEY = 'kijani_cart_token'

export function getOrCreateCartToken() {
  if(typeof window === 'undefined') return ''
  let token     = localStorage.getItem(CART_TOKEN_KEY)
  if(!token){
    token = crypto.randomUUID()
    localStorage.setItem(CART_TOKEN_KEY, token)
  }

  return token
}


// Called after a successful cart merge — the guest token is now
// meaningless since everything moved into the user's real account cart.
export function clearCartToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_TOKEN_KEY)
}