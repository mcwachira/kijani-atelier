import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { messagesQuery } from '@/lib/queries'
import { markMessageRead, replyToMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/messages')({
  head: () => ({
    meta: [
      { title: 'Messages — Kijani Atelier Admin' },
      {
        name: 'description',
        content: 'Customer enquiries and support conversations in one inbox.',
      },
      { property: 'og:title', content: 'Messages — Kijani Atelier Admin' },
      { property: 'og:description', content: 'Customer enquiries inbox.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminMessages,
})

function AdminMessages() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: loadError, refetch } = useQuery(
    messagesQuery(),
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selected = data?.find((m) => m.id === selectedId) ?? data?.[0]

  useEffect(() => {
    if (selected?.unread) {
      markMessageRead(selected.id)
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['messages'] }),
        )
        .catch((err: Error) =>
          toast.error(err.message || 'Could not update the message.'),
        )
    }
  }, [selected?.id, selected?.unread, queryClient])

  const reply = useMutation({
    mutationFn: replyToMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['customer-messages'] })
      setBody('')
      setError(null)
      toast.success('Reply sent.')
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <AdminLayout
      title="Messages"
      description="What customers are asking the atelier."
    >
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden shadow-[var(--shadow-soft)]">
          <CardContent className="p-0">
            {isLoading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            {isError && (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    {loadError.message || 'Could not load messages.'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refetch()}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <ul className="divide-y divide-border">
              {data?.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id)
                      setBody('')
                      setError(null)
                    }}
                    className={cn(
                      'w-full px-4 py-4 text-left transition-colors hover:bg-secondary/60',
                      selected?.id === m.id && 'bg-secondary',
                    )}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDate(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground/80">
                      {m.subject}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {m.preview}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {m.unread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                      {m.replies.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {m.replies.length}{' '}
                          {m.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit shadow-[var(--shadow-soft)]">
          <CardContent className="pt-6">
            {selected ? (
              <>
                <h2 className="font-display text-2xl">{selected.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.name} · {selected.email} ·{' '}
                  {formatDate(selected.created_at)}
                </p>

                <div className="mt-6 space-y-4">
                  <ThreadBubble
                    author="customer"
                    name={selected.name}
                    body={selected.body}
                    at={selected.created_at}
                  />
                  {selected.replies.map((r) => (
                    <ThreadBubble
                      key={r.id}
                      author={r.author}
                      name={r.author_name}
                      body={r.body}
                      at={r.created_at}
                    />
                  ))}
                </div>

                <form
                  className="mt-8"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setError(null)
                    if (body.trim().length < 2) {
                      setError('Write a reply before sending.')
                      return
                    }
                    reply.mutate({
                      id: selected.id,
                      body,
                    })
                  }}
                >
                  <Textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={1000}
                    placeholder="Write a reply…"
                    aria-label="Reply"
                  />
                  {error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="mt-3"
                    disabled={reply.isPending}
                  >
                    {reply.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send reply
                  </Button>
                </form>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Select a message to read it.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export function ThreadBubble({
  author,
  name,
  body,
  at,
}: {
  author: 'customer' | 'admin'
  name: string
  body: string
  at: string
}) {
  return (
    <div
      className={cn(
        'flex',
        author === 'admin' ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-md px-4 py-3',
          author === 'admin'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground',
        )}
      >
        <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">
          {name}
        </p>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
          {body}
        </p>
        <p className="mt-2 text-[11px] opacity-60">{formatDate(at)}</p>
      </div>
    </div>
  )
}
