import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Circle } from 'lucide-react'
import { z } from 'zod'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiError } from '@/lib/api';
import { resetPassword } from '@/lib/api'

const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
] as const


// Client-side validation mirrors (doesn't replace) the backend's rules.
// Catching an obviously-invalid password here means an instant error
// instead of a round trip to the API just to get told the same thing.
const schema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(128, { message: 'Password must be less than 128 characters' })
      .regex(/[A-Z]/, { message: 'Include at least one uppercase letter' })
      .regex(/[a-z]/, { message: 'Include at least one lowercase letter' })
      .regex(/\d/, { message: 'Include at least one number' })
      .refine((v) => !/\s/.test(v), {
        message: 'Password cannot contain spaces',
      }),
    confirm: z.string().min(1, { message: 'Please confirm your password' }),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export const Route = createFileRoute('/reset-password')({
  // Reads ?token=...&email=... from the URL — this is EXACTLY what
  // AppServiceProvider's ResetPassword::createUrlUsing() generates on the
  // backend, so the two sides must stay in sync. If you ever rename these
  // query params on one side, rename them on the other too.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
    email: typeof search.email === 'string' ? search.email : '',
  }),
  head: () => ({
    meta: [
      { title: 'Reset Password — Kijani Atelier' },
      {
        name: 'description',
        content: 'Choose a new password for your Kijani Atelier account.',
      },
      { property: 'og:title', content: 'Reset Password — Kijani Atelier' },
      {
        property: 'og:description',
        content: 'Set a new password for your Kijani Atelier account.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, email } = Route.useSearch()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // The backend REQUIRES email alongside token — Laravel's Password::reset
  // can't look up which account to reset with only a token. If the link
  // is missing either piece, it's not usable — treat it the same as an
  // expired/invalid link rather than letting the user submit a request
  // that's guaranteed to 422.
  const linkIsUsable = Boolean(token) && Boolean(email)

  const mutation = useMutation({
    // password_confirmation is sent as the SAME value as password — safe
    // here specifically because the zod schema above already enforces
    // password === confirm before this ever fires, so there's no
    // meaningful difference between sending `confirm` or `password` twice.
    mutationFn: (password: string) =>
      resetPassword(token, email, password, password),
    onSuccess: (res) => {
      toast.success(res.message)
      navigate({ to: '/login' })
    },
    onError: (err: ApiError) =>
      toast.error(err.message || "We couldn't reset your password.", {
        description: 'Please try again in a moment.',
        action: { label: 'Retry', onClick: () => mutation.mutate(password) },
      }),
  })

  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6 lg:py-28">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl">Set a new password</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {email
            ? `Resetting the password for ${email}.`
            : "Choose a password you haven't used before."}
        </p>

        {!linkIsUsable ? (
          <div className="mt-9 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="font-display text-xl">This link is invalid</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reset links expire after a short while. Request a fresh one.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-9 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const parsed = schema.safeParse({ password, confirm })
              if (!parsed.success) {
                const next: Record<string, string> = {}
                for (const issue of parsed.error.issues)
                  next[String(issue.path[0])] = issue.message
                setErrors(next)
                return
              }
              setErrors({})
              mutation.mutate(parsed.data.password)
            }}
          >
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5"
              />
              <ul className="mt-2 space-y-1">
                {RULES.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-2 text-xs ${ok ? 'text-accent' : 'text-muted-foreground'}`}
                    >
                      {ok ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Circle className="h-3 w-3" aria-hidden />
                      )}
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
              {errors.password && (
                <p role="alert" className="mt-1.5 text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-1.5"
              />
              {!errors.confirm &&
                confirm.length > 0 &&
                confirm !== password && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Passwords do not match yet.
                  </p>
                )}
              {errors.confirm && (
                <p role="alert" className="mt-1.5 text-sm text-destructive">
                  {errors.confirm}
                </p>
              )}
            </div>
            {mutation.isError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
              >
                <p className="text-sm text-destructive">
                  {mutation.error.message}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => mutation.mutate(password)}
                  disabled={mutation.isPending}
                >
                  Retry
                </Button>
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                mutation.isPending ||
                !RULES.every((r) => r.test(password)) ||
                password !== confirm
              }
            >
              {mutation.isPending ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        )}
      </div>
    </StoreLayout>
  )
}
