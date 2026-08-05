import { createFileRoute , Link, useNavigate} from '@tanstack/react-router'
import {useMutation} from '@tanstack/react-query'
import {toast} from 'sonner'
import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, setAuthToken } from '@/lib/api'
import { useMemo, useState } from 'react'
import { getPasswordStrength } from '#/lib/utils.ts'


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

function RegisterPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const strength = useMemo(() => getPasswordStrength(password), [password])

  // Only show a mismatch warning once the user has actually started typing
  // in the confirm field — otherwise it flashes red the instant they focus
  // the first password field, before they've had a chance to confirm anything.
  const showMismatch =
    passwordConfirmation.length > 0 && password !== passwordConfirmation

  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      // Use setAuthToken from lib/api.ts, not a raw localStorage.setItem
      // under a different key. This keeps the token in the SAME place
      // apiFetch() reads from — every future authenticated call
      // (authApi.me(), authApi.logout(), cart/order calls later) will
      // automatically pick it up.
      setAuthToken(res.token)

      // Still worth keeping the full user object somewhere for the UI to
      // read (name, email, verified status) — a separate, non-auth key is
      // fine for that, since it's just display data, not the credential.
      localStorage.setItem('kijani-user', JSON.stringify(res.user))

      // Note: real app routes will require a VERIFIED email once Phase 2's
      // `verified` middleware group is actually populated with routes.
      // Right now this just goes home — revisit this once product/cart
      // routes are gated, and consider routing to a "check your email"
      // screen instead.
      toast.success('Account created -Karibu Kijani!')
      navigate({ to: '/' })
    },
    onError: (error: any) => {
      //authApi throws Laravel's raw error body:{message:errors?}
      // errors is keyed by field name — show the FIRST specific message
      // if one exists, otherwise fall back to the generic message.

      const fieldErrors = error?.errors as Record<string, string[]> | undefined

      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors)[0]?.[0]
        : undefined
      toast.error(
        firstFieldError ??
          error?.message ??
          "We couldn't create that account. Please try again.",
      )
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

            // Client-side guard: don't even hit the API if the passwords
            // obviously don't match — saves a round trip and gives instant
            // feedback rather than waiting on the backend's 422 response.
            if (password !== passwordConfirmation) {
              toast.error('Passwords do not match.')
              return
            }
            const form = new FormData(e.currentTarget)
            mutation.mutate({
              name: String(form.get('name')),
              email: String(form.get('email')),
              password,
              password_confirmation: passwordConfirmation,
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          {/*  Strength meter - will only render once the user has started to type something*/}
            {password.length > 0 &&(
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className={`h-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-muted'}`}

                    />
                  ))}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              minLength={8}
              required
              className="mt-1.5"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              aria-invalid={showMismatch}
            />

            {showMismatch && (
              <p className="mt-1.5 text-xs text-red-600">
                Passwords don't match.
              </p>
            )}
            {passwordsMatch && (
              <p className="mt-1.5 text-xs text-green-600">
                Passwords match.
              </p>
            )}

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

