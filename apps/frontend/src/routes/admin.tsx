import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: () => (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl">Admin Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Dashboard coming soon.</p>
    </div>
  ),
})
