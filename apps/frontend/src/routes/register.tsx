import { createFileRoute , Link, useNavigate} from '@tanstack/react-router'
import {useMutation} from '@tanstack/react-query'
import {toast} from 'sonner'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { register } from '@/lib/api'


export const Route = createFileRoute('/register')({
  head: () => ({
    meta: [
      { title: 'Create Account — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Create a Kijani Atelier account for faster checkout and early access to drops.',
      },
      { property: 'og:title', content: 'Create Account — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Join Kijani Atelier for early access to new pieces.',
      },
    ],
  }),
  component: RegisterPage,
})

function RegisterPage(){
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      toast.success('Account created -Karribu Kijani')
      navigate({ to: '/' })
    },
    onError: () => {
      toast.error("We couldn't create that account. Please try again.")
    },
  })
  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6 lg:py-28">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl">Join the atelier</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Early access to small-batch drops, and a faster checkout.
        </p>

        <form
          className="mt-9 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            mutation.mutate({
              name: String(form.get('name')),
              email: String(form.get('email')),
              password: String(form.get('password')),
            })
          }}
        >
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </StoreLayout>
  )
}

