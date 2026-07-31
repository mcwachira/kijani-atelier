import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { categoriesQuery } from '@/lib/queries'
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from '@/lib/api'
import type { Category } from '@/types'

export const Route = createFileRoute('/admin/categories')({
  head: () => ({
    meta: [
      { title: 'Categories — Kijani Atelier Admin' },
      {
        name: 'description',
        content: 'Manage the collections and categories shown in the store.',
      },
      { property: 'og:title', content: 'Categories — Kijani Atelier Admin' },
      { property: 'og:description', content: 'Manage store collections.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminCategories,
})

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(60, 'Name must be under 60 characters.'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters.')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only.'),
  description: z
    .string()
    .trim()
    .max(240, 'Keep the description under 240 characters.')
    .default(''),
})

type FieldErrors = Partial<Record<keyof CategoryInput, string>>

function CategoryForm({
  category,
  onDone,
}: {
  category?: Category
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<FieldErrors>({})

  const mutation = useMutation({
    mutationFn: (input: CategoryInput) =>
      category ? updateCategory(category.id, input) : createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(category ? 'Category updated.' : 'Category created.')
      onDone()
    },
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsed = categorySchema.safeParse({
      name: String(form.get('name') ?? ''),
      slug: String(form.get('slug') ?? ''),
      description: String(form.get('description') ?? ''),
    })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof CategoryInput] = issue.message
      setErrors(next)
      return
    }
    setErrors({})
    mutation.mutate(parsed.data)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(mutation.error as Error).message || 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="c-name">Name</Label>
        <Input
          id="c-name"
          name="name"
          defaultValue={category?.name}
          className="mt-1.5"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name}</p>
        )}
      </div>
      <div>
        <Label htmlFor="c-slug">Slug</Label>
        <Input
          id="c-slug"
          name="slug"
          placeholder="woven-bags"
          defaultValue={category?.slug}
          className="mt-1.5"
          aria-invalid={!!errors.slug}
        />
        {errors.slug && (
          <p className="mt-1 text-xs text-destructive">{errors.slug}</p>
        )}
      </div>
      <div>
        <Label htmlFor="c-desc">Description</Label>
        <Textarea
          id="c-desc"
          name="description"
          rows={3}
          defaultValue={category?.description}
          className="mt-1.5"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">{errors.description}</p>
        )}
      </div>
      <DialogFooter>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? 'Saving…'
            : category
              ? 'Save changes'
              : 'Add category'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AdminCategories() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch } =
    useQuery(categoriesQuery())
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const removal = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category removed.')
      setDeleting(null)
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Could not delete that category.'),
  })

  return (
    <AdminLayout
      title="Categories"
      description="Collections customers can browse."
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add category
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                {(error as Error).message || 'Could not load categories.'}
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

        {!isLoading && !isError && !data?.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No collections yet.
          </p>
        )}

        {data?.map((c) => (
          <Card key={c.id} className="shadow-[var(--shadow-soft)]">
            <CardContent className="flex items-center gap-4 p-4">
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="h-16 w-14 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.products_count} products
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(c)}
                aria-label={`Edit ${c.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleting(c)}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              New category
            </DialogTitle>
          </DialogHeader>
          {creating && <CategoryForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Edit category
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <CategoryForm category={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Collections with products can't be removed until those pieces are
              moved or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removal.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleting) removal.mutate(deleting.id)
              }}
              disabled={removal.isPending}
            >
              {removal.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
