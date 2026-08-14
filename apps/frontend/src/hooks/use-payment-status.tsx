import { useEffect, useRef, useState } from 'react'
import type { PaymentStatus } from '@/types'
import { getPaymentStatus } from '@/lib/api.ts'


/**
 * Polls GET /payments/{paymentId}/status every 3 seconds until the
 * payment resolves to 'completed' or 'failed', or a 2-minute timeout is
 * reached (STK prompts that go unanswered eventually time out on
 * Safaricom's side anyway — see ResultCode 1037 in the backend).
 */

export function  usePaymentStatus(paymentId:number | null) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const attempts = useRef(0)


  useEffect(() => {
    if(!paymentId) return

    let cancelled = false;
    attempts.current = 0;

    const poll = async() => {

      if(cancelled) return
      try {
        const result = await getPaymentStatus(paymentId)
        if (cancelled) return
        setStatus(result)

        if (result.status === 'pending') {
          attempts.current += 1
          if (attempts.current >= 40) {
            // ~40 * 3s = 2 minutes
            setTimedOut(true)
            return
          }
          setTimeout(poll, 3000)
        }
      } catch {
        if (!cancelled) setTimeout(poll, 3000)
      }
    }
    poll()

    return () => {
    cancelled = true;
    }

  },[paymentId])
  return { status, timedOut }
}