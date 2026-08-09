import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { createReview, getAuthToken  } from '@/lib/api'
import type {ApiError} from '@/lib/api';
import { reviewsQuery } from '@/lib/queries'
import { formatDate } from '@/lib/format'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Choose a rating.').max(5),
  body: z
    .string()
    .trim()
    .min(10, 'Tell us a little more — at least 10 characters.')
    .max(1000, 'Reviews are limited to 1000 characters.'),
})

export function ProductReviews({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const {
    data: reviews,
    isLoading,
    isError,
  } = useQuery(reviewsQuery(productId))
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reviews now REQUIRE login (POST /products/{product}/reviews returns
  // 401 for guests) — check for a token before even showing the form.
  const isLoggedIn = !!getAuthToken()
  const queryKey = ['reviews', String(productId)]

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: (review) => {
      queryClient.setQueryData<typeof reviews>(queryKey, (current) => [
        review,
        ...(current ?? []),
      ])
      toast.success('Thank you — your review has been submitted.')
      setBody('')
      setRating(5)
      setError(null)
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (err:ApiError) =>
      setError(err.message|| "We couldn't submit your review. Please try again."),
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const parsed = reviewSchema.safeParse({ rating, body })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)
    mutation.mutate({
      product_id: productId,
      rating: parsed.data.rating,
      body: parsed.data.body,
    })
  }

  return (
    <section className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <h2 className="font-display text-2xl">Reviews</h2>
        <div className="mt-6 space-y-6">
          {isLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          {isError && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Failed to load reviews.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey })}
              >
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !isError && !reviews?.length && (
            <p className="text-sm text-muted-foreground">
              No reviews yet — be the first to share your thoughts.
            </p>
          )}
          {reviews?.map((review) => (
            <div key={review.id}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm font-medium">{review.author}</p>
                <StarRating value={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {review.body}
              </p>
              <Separator className="mt-6" />
            </div>
          ))}
        </div>
      </div>

      {isLoggedIn ? (
        <form
          className="h-fit rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          onSubmit={submit}
          noValidate
        >
          <h3 className="font-display text-xl">Write a review</h3>
          <div className="mt-5 space-y-4">
            <div>
              <span className="eyebrow">Your rating</span>
              <StarRating
                value={rating}
                size={22}
                interactive
                onChange={setRating}
                className="mt-2"
              />
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How does it wear, fit and feel?"
              rows={4}
              maxLength={1000}
              aria-label="Your review"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        </form>
      ) : (
        // Login-gated fallback — the endpoint 401s for guests, so there's
        // no point rendering a form that will always fail.
        <div className="h-fit rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to leave a review.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}
    </section>
  )
}