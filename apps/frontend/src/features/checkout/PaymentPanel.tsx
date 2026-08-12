import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  initiateMpesaPayment,
  initiatePaystackPayment,
  type ApiError,
} from '@/lib/api'
import { usePaymentStatus } from '@/hooks/use-payment-status'
import type { Order } from '@/types'

// Drop this in right after an order is created — pass the returned Order
// object. Handles both payment providers end to end: M-Pesa polls this
// page until the STK push resolves; Paystack redirects the browser away
// to Paystack's hosted checkout page entirely.
export function PaymentPanel({ order }: { order: Order }) {
  const navigate = useNavigate()
  const [method, setMethod] = useState<'mpesa' | 'card'>('mpesa')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(order.email ?? '')
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { status, timedOut } = usePaymentStatus(paymentId)

  // Once M-Pesa's async callback confirms success, move on to the
  // success page — same destination a real checkout flow should already have.
  if (status?.status === 'completed') {
    navigate({
      to: '/checkout/success',
      search: { reference: order.reference },
    })
  }

  const payWithMpesa = async () => {
    if (!/^(0|\+?254)[71]\d{8}$/.test(phone)) {
      toast.error('Enter a valid M-Pesa phone number.')
      return
    }
    setSubmitting(true)
    try {
      const res = await initiateMpesaPayment({
        order_reference: order.reference,
        phone,
      })
      setPaymentId(res.payment_id)
      toast.success('Check your phone to complete payment.')
    } catch (err) {
      toast.error(
        (err as ApiError).message || 'Could not start M-Pesa payment.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const payWithCard = async () => {
    if (!email.includes('@')) {
      toast.error('Enter a valid email for your card receipt.')
      return
    }
    setSubmitting(true)
    try {
      const res = await initiatePaystackPayment({
        order_reference: order.reference,
        email,
      })
      // Redirect the WHOLE browser to Paystack's hosted page — card
      // details are entered there, never on this site.
      window.location.href = res.authorization_url
    } catch (err) {
      toast.error((err as ApiError).message || 'Could not start card payment.')
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-xl">Payment method</h2>

      <RadioGroup
        value={method}
        onValueChange={(v) => setMethod(v as 'mpesa' | 'card')}
        className="mt-4 space-y-3"
      >
        <label className="flex items-center gap-3 rounded-md border border-border p-3 has-[:checked]:border-accent">
          <RadioGroupItem value="mpesa" id="pay-mpesa" />
          <span className="text-sm font-medium">M-Pesa</span>
        </label>
        <label className="flex items-center gap-3 rounded-md border border-border p-3 has-[:checked]:border-accent">
          <RadioGroupItem value="card" id="pay-card" />
          <span className="text-sm font-medium">Card</span>
        </label>
      </RadioGroup>

      {method === 'mpesa' && !paymentId && (
        <div className="mt-5 space-y-3">
          <div>
            <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
            <Input
              id="mpesa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              className="mt-1.5"
            />
          </div>
          <Button
            className="w-full"
            onClick={payWithMpesa}
            disabled={submitting}
          >
            {submitting ? 'Sending prompt…' : `Pay ${order.total} via M-Pesa`}
          </Button>
        </div>
      )}

      {method === 'mpesa' &&
        paymentId &&
        status?.status === 'pending' &&
        !timedOut && (
          <div className="mt-5 flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-sm">
              Check your phone and enter your M-Pesa PIN.
            </p>
            <p className="text-xs text-muted-foreground">
              Waiting for confirmation…
            </p>
          </div>
        )}

      {method === 'mpesa' &&
        paymentId &&
        (status?.status === 'failed' || timedOut) && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-destructive">
              {timedOut
                ? 'This took too long — please try again.'
                : 'Payment was not completed.'}
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setPaymentId(null)}
            >
              Try again
            </Button>
          </div>
        )}

      {method === 'card' && (
        <div className="mt-5 space-y-3">
          <div>
            <Label htmlFor="card-email">Email (for your receipt)</Label>
            <Input
              id="card-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button
            className="w-full"
            onClick={payWithCard}
            disabled={submitting}
          >
            {submitting ? 'Redirecting…' : `Pay ${order.total} by card`}
          </Button>
        </div>
      )}
    </div>
  )
}
