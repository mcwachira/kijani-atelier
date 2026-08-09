import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiError } from '@/lib/api';
import { login} from '@/lib/api'
import { useCart } from '@/hooks/use-cart.tsx'
import { useWishlist } from '@/hooks/use-whishlist.tsx'
import { useAuth } from '@/hooks/use-auth'


export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign In — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Sign in to your Kijani Atelier account to track orders and saved pieces.',
      },
      { property: 'og:title', content: 'Sign In — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Sign in to your Kijani Atelier account.',
      },
    ],
  }),
  component: LoginPage,
})
function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const { merge: mergeCart } = useCart()
  const { syncToServer: syncWishlistToServer } = useWishlist()

  const mutation = useMutation({
    mutationFn: login,
    onSuccess:async (res) => {
      // setAuthToken keeps the token in the SAME place apiFetch reads
      // from — writing to a separate 'kijani-auth' key (the old code)
      // meant every request after login would go out unauthenticated.
      setSession(res.token, res.user)

      // Fold the guest's cart + wishlist into the now-authenticated
      // account. MUST happen after setAuthToken — both calls hit
      // auth:sanctum-protected endpoints and need the bearer token
      // already in place.
      await Promise.all([mergeCart(), syncWishlistToServer()])


      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}.`)
      navigate({ to: '/' })
    },
    onError: (err: ApiError) => {
      // The backend deliberately returns the SAME generic message whether
      // the email doesn't exist or the password is wrong (see LoginRequest
      // — no 'exists:users,email' rule). We just display err.message as-is
      // rather than trying to guess which one failed.
      toast.error(err.message || "Those details didn't match. Try again.")
    },
  })
  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6 lg:py-28">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl">Welcome back</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to follow your orders and keep your favourites close.
        </p>

        <form
          className="mt-9 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            mutation.mutate({
              email: String(form.get("email")),
              password: String(form.get("password"))
            });
          }}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required className="mt-1.5" />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/register" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link to="/forgot-password" className="underline underline-offset-4">
            Forgot your password?
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
