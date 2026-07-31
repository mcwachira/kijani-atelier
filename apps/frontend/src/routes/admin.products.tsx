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
import {
  createProduct,
  deleteProduct,
  updateProduct

} from '@/lib/api'
import type {ProductInput} from '@/lib/api';
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

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be under 80 characters.'),
  price: z
    .number()
    .positive('Price must be greater than zero.')
    .max(1_000_000),
  stock: z
    .number()
    .int('Stock must be a whole number.')
    .min(0, 'Stock cannot be negative.'),
  category: z.string().min(1, 'Choose a category.'),
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
  const [category, setCategory] = useState(product?.category.slug ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!category && categories?.length)
      setCategory(product?.category.slug ?? categories[0].slug)
  }, [categories, category, product])

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
      stock: Number(form.get('stock')),
      category,
      description: String(form.get('description') ?? ''),
    })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof ProductInput] = issue.message
      setErrors(next)
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
            value={category}
            onValueChange={setCategory}
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
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="mt-1 text-xs text-destructive">{errors.category}</p>
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
  const { data, isLoading, isError, error, refetch } = useQuery(
    productsQuery({ per_page: 50 }),
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
