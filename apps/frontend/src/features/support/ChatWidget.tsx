import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";



interface ChatMessage {
  id: number
  from: 'bot' | 'user'
  text: string
}

const replies = [
  "Most of our sandals run true to size — if you're between sizes we suggest going up.",
  'Every kiondo is woven to order, so delivery within Kenya takes 3–5 working days.',
  'Yes, we can weave custom colourways. Tell me the shades you have in mind.',
  'Happy to help with that — a stylist from the atelier will follow up by email shortly.',
]


export function ChatWidget(){
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: 'bot',
      text: 'Karibu! I\'m Nia from the atelier. Ask me about sizing, materials or delivery.',
    },
  ])

  const endRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const send = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    const id = Date.now()
    setMessages((m) => [...m, { id, from: 'user', text }])
    setDraft('')
    timerRef.current = setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: id + 1, from: 'bot', text: replies[m.length % replies.length] },
      ])
    }, 800)
  }, [draft])

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-lift)] sm:right-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Atelier support</p>
              <p className="text-xs text-muted-foreground">
                Typically replies in a few minutes
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex',
                  m.from === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <p
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                    m.from === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-border px-3 py-3"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              aria-label="Message"
            />
            <Button type="submit" size="icon" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        onClick={() => setOpen((o) => !o)}
        size="icon"
        className="fixed bottom-6 right-4 z-50 h-12 w-12 rounded-full shadow-[var(--shadow-lift)] sm:right-6"
        aria-label="Chat with the atelier"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </Button>
    </>
  )
}