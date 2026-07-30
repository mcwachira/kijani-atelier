import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/messages')({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl">Messages</h1>
      <p className="mt-2 text-muted-foreground">
        Customer enquiries will appear here.
      </p>
    </div>
  ),
})
