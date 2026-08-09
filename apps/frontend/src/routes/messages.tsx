import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createMessage } from '@/lib/api'
import type { ApiError } from '@/lib/api'

export const Route = createFileRoute('/messages')({
  head: () => ({
    meta: [
      { title: 'Contact — Kijani Atelier' },
      {
        name: 'description',
        content: 'Questions about sizing, orders, or a custom piece? Send us a message.',
      },
    ],
  }),
  component: MessagesPage,
})

function MessagesPage() {
  const [sent, setSent] = useState(false)

  const mutation = useMutation({
    mutationFn: createMessage,
    onSuccess: () => {
      setSent(true)
      toast.success('Message sent — we typically reply within a day.')
    },
    onError: (err: ApiError) => toast.error(err.message || "We couldn't send that. Please try again."),
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    mutation.mutate({
      name: String(form.get('name')),
      email: String(form.get('email')),
      subject: String(form.get('subject')),
      body: String(form.get('body')),
    })
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:py-24">
        <h1 className="font-display text-4xl">Get in touch</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sizing questions, order enquiries, custom pieces — we read everything ourselves.
        </p>

        {sent ? (
          <div className="mt-9 rounded-lg border border-border bg-card p-6">
            <p className="text-sm">Thanks — your message is in. We'll reply by email shortly.</p>
          </div>
        ) : (
          <form className="mt-9 space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={255} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required maxLength={255} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" name="body" rows={5} required maxLength={1000} className="mt-1.5" />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        )}
      </div>
    </StoreLayout>
  )
}