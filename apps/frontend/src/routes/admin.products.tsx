import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { categoriesQuery, productsQuery } from '@/lib/queries'
import { createProduct, deleteProduct, updateProduct } from '@/lib/api'
import type { ProductInput } from '@/lib/api'
import { zodFieldErrors } from '@/lib/utils'
import { formatKes } from '@/lib/format'
import type { Product } from '@/types'

export const Route = createFileRoute('/admin/products')({
  head: () => ({
    meta: [
      { title: 'Products — Kijani Atelier Admin' },
      {
        name: 'description',
        content: 'Add, edit and manage the Kijani Atelier product catalogue.',
      },
      { property: 'og:title', content: 'Products — Kijani Atelier Admin' },
      { property: 'og:description', content: 'Manage the product catalogue.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminProducts,
})

// NOTE: category is now validated as a numeric id (category_id on the
// backend), not a slug string like before. The Select below stores it as
// a STRING internally (shadcn's Select only works with string values),
// then we Number()-convert right before validation/submission.
const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be under 80 characters.'),
  price: z.number().positive('Price must be greater than zero.').max(1_000_000),
  stock: z
    .number({ error: 'Stock must be a whole number.' })
    .int('Stock must be a whole number.')
    .min(0, 'Stock cannot be negative.'),
  category_id: z
    .number({ error: 'Choose a category.' })
    .int()
    .positive('Choose a category.'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be under 1000 characters.')
    .default(''),
})

type FieldErrors = Partial<Record<keyof ProductInput, string>>

function ProductForm({
  product,
  onDone,
}: {
  product?: Product
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const { data: categories, isLoading: loadingCategories } =
    useQuery(categoriesQuery())

  // Stored as a STRING (Select's requirement), even though it represents
  // a numeric category id underneath — converted with Number() at submit.
  const [categoryId, setCategoryId] = useState<string>(
    product?.category.id ? String(product.category.id) : '',
  )
  const [errors, setErrors] = useState<FieldErrors>({})

  // Once categories load, default to the product's own category (when
  // editing) or the first available category (when creating) — mirrors
  // the old slug-based version's behavior, just keyed on id now.
  useEffect(() => {
    if (!categoryId && categories?.length) {
      setCategoryId(String(product?.category.id ?? categories[0].id))
    }
  }, [categories, categoryId, product])

  const mutation = useMutation({
    mutationFn: (input: ProductInput) =>
      product ? updateProduct(product.id, input) : createProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(product ? 'Product updated.' : 'Product created.')
      onDone()
    },
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsed = productSchema.safeParse({
      name: String(form.get('name') ?? ''),
      price: Number(form.get('price')),
      stock: form.get('stock') === '' ? undefined : Number(form.get('stock')),
      // Number(categoryId) — converts the Select's string value back to
      // the numeric category_id the backend actually expects. An empty
      // string becomes NaN here, which correctly fails the schema's
      // .positive() check rather than silently submitting a bad value.
      category_id: Number(categoryId),
      description: String(form.get('description') ?? ''),
    })
    if (!parsed.success) {
      setErrors(zodFieldErrors<keyof ProductInput>(parsed.error.issues))
      return
    }
    setErrors({})
    mutation.mutate(parsed.data)
  }

  return (
    <form onSubmit={submit} noValidate>
      {mutation.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(mutation.error as Error).message || 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="p-name">Name</Label>
          <Input
            id="p-name"
            name="name"
            defaultValue={product?.name}
            className="mt-1.5"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div>
          <Label htmlFor="p-price">Price (KSh)</Label>
          <Input
            id="p-price"
            name="price"
            type="number"
            defaultValue={product?.price}
            className="mt-1.5"
            aria-invalid={!!errors.price}
          />
          {errors.price && (
            <p className="mt-1 text-xs text-destructive">{errors.price}</p>
          )}
        </div>
        <div>
          <Label htmlFor="p-stock">Stock</Label>
          <Input
            id="p-stock"
            name="stock"
            type="number"
            defaultValue={product?.stock}
            className="mt-1.5"
            aria-invalid={!!errors.stock}
          />
          {errors.stock && (
            <p className="mt-1 text-xs text-destructive">{errors.stock}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="p-cat">Category</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={loadingCategories}
          >
            <SelectTrigger id="p-cat" className="mt-1.5">
              <SelectValue
                placeholder={
                  loadingCategories ? 'Loading…' : 'Choose a category'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {/* value is the category's id (as a string) — this is the
                  actual behavioral change from the slug-based version */}
              {categories?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="mt-1 text-xs text-destructive">
              {errors.category_id}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="p-desc">Description</Label>
          <Textarea
            id="p-desc"
            name="description"
            rows={4}
            defaultValue={product?.description}
            className="mt-1.5"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">
              {errors.description}
            </p>
          )}
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Saving…'
            : product
              ? 'Save changes'
              : 'Create product'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AdminProducts() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, refetch } = useQuery(
    productsQuery({ per_page: 10, page }),
  )
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const removal = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Product deleted.')
      setDeleting(null)
    },
    onError: (err: Error) =>
      toast.error(err.message || 'Could not delete that product.'),
  })

  return (
    <AdminLayout
      title="Products"
      description="Everything currently listed in the store."
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add product
        </Button>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="overflow-x-auto pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  {(error as Error).message || 'Could not load products.'}
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
          ) : !data?.data.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No products yet — add your first piece.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <img
                        src={p.images[0]}
                        alt=""
                        loading="lazy"
                        className="h-12 w-10 rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.stock > 6 ? 'secondary' : 'destructive'}
                        className="rounded-full"
                      >
                        {p.stock} in stock
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKes(p.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.meta.last_page > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.current_page} of {data.meta.last_page} ·{' '}
            {data.meta.total} products
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              New product
            </DialogTitle>
          </DialogHeader>
          {creating && <ProductForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Edit product
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <ProductForm product={editing} onDone={() => setEditing(null)} />
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
              This removes the piece from the storefront. This action can't be
              undone.
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
