import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/api'

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
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}.`);
      navigate({ to: "/" });
    },
    onError: () => toast.error("Those details didn't match. Try again."),
  });

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
            mutation.mutate({ email: String(form.get("email")), password: String(form.get("password")) });
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
          New here?{" "}
          <Link to="/register" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
