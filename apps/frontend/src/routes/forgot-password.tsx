import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPassword } from '@/lib/api'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: 'Forgot Password — Kijani Atelier' },
      {
        name: 'description',
        content: 'Reset your Kijani Atelier password with a secure email link.',
      },
      { property: 'og:title', content: 'Forgot Password — Kijani Atelier' },
      {
        property: 'og:description',
        content:
          'Request a password reset link for your Kijani Atelier account.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const lastEmail = useRef('')

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (res) => toast.success(res.message),
    onError: () =>
      toast.error("We couldn't send that reset link.", {
        description: 'Check your connection and try again.',
        action: {
          label: 'Retry',
          onClick: () => mutation.mutate(lastEmail.current),
        },
      }),
  })

  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6 lg:py-28">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl">Forgot your password?</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to set a new one.
        </p>

        {mutation.isSuccess ? (
          <div className="mt-9 rounded-lg border border-border bg-card p-6">
            <p className="text-sm">{mutation.data.message}</p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-9 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              lastEmail.current = String(form.get('email')).trim()
              mutation.mutate(lastEmail.current)
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                maxLength={255}
                className="mt-1.5"
              />
            </div>
            {mutation.isError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
              >
                <p className="text-sm text-destructive">
                  We couldn't send that reset link.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => mutation.mutate(lastEmail.current)}
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
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Sending link…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{' '}
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
