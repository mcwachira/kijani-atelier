import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api';
import { verifyEmail } from '@/lib/api'

export const Route = createFileRoute('/verify-email')({
  // Reads ?id=...&hash=...&expires=...&signature=... — exactly what
  // AppServiceProvider's VerifyEmail::createUrlUsing() generates on the
  // backend. Keep these two in sync if the query param names ever change
  // on either side.
  validateSearch: (search: Record<string, unknown>) => ({
    id: search.id != null ? String(search.id) : '',
    hash: typeof search.hash === 'string' ? search.hash : '',
    expires: search.expires != null ? String(search.expires) : '',
    signature: typeof search.signature === 'string' ? search.signature : '',
  }),
  head: () => ({
    meta: [
      { title: 'Verify Email — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Confirm your email address to finish setting up your Kijani Atelier account.',
      },
    ],
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { id, hash, expires, signature } = Route.useSearch()

  // A link is only usable if ALL four pieces are present — same principle
  // as reset-password's linkIsUsable check. Missing any one means this
  // definitely isn't a real link from the verification email.
  const linkIsUsable =
    Boolean(id) && Boolean(hash) && Boolean(expires) && Boolean(signature)

  const mutation = useMutation({
    mutationFn: () => verifyEmail({ id, hash, expires, signature }),
  })

  // useRef guards against React 18 Strict Mode's double-invoke behavior in
  // development, which would otherwise fire this verification request
  // TWICE on mount — harmless here since the backend just returns "already
  // verified" on the second call, but avoids a confusing double network
  // request while debugging.
  const hasFired = useRef(false)

  useEffect(() => {
    if (linkIsUsable && !hasFired.current) {
      hasFired.current = true
      mutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkIsUsable])

  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6 lg:py-28">
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-display text-4xl">Verifying your email</h1>

        {!linkIsUsable ? (
          <div className="mt-9 w-full rounded-lg border border-dashed border-border p-6">
            <p className="font-display text-xl">This link is invalid</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verification links expire after an hour. You can request a new one
              from your account.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : mutation.isPending ? (
          <p className="mt-9 text-sm text-muted-foreground">One moment…</p>
        ) : mutation.isSuccess ? (
          <div className="mt-9 flex w-full flex-col items-center rounded-lg border border-border bg-card p-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
            <p className="mt-3 font-display text-xl">Email verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mutation.data.message}
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/">Continue shopping</Link>
            </Button>
          </div>
        ) : mutation.isError ? (
          <div className="mt-9 flex w-full flex-col items-center rounded-lg border border-destructive/40 bg-destructive/5 p-6">
            <XCircle className="h-10 w-10 text-destructive" aria-hidden />
            <p className="mt-3 font-display text-xl">Verification failed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {(mutation.error as ApiError)?.message ||
                'This link may have expired.'}
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </StoreLayout>
  )
}
