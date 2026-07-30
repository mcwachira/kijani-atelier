import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { ProductGrid } from '@/features/products/ProductGrid'
import { StarRating } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { categoriesQuery, productsQuery } from '@/lib/queries'

import hero from '@/assets/hero.jpg'
import craft from '@/assets/craft.jpg'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Kijani Atelier — Handcrafted for the Modern Woman' },
      {
        name: 'description',
        content:
          'Handmade leather and beaded sandals, kiondos, woven handbags and artisan accessories, made in small batches by women artisans in Kenya.',
      },
      {
        property: 'og:title',
        content: 'Kijani Atelier — Handcrafted for the Modern Woman',
      },
      {
        property: 'og:description',
        content:
          'Leather sandals, kiondos and woven bags made by hand in Kenya.',
      },
    ],
  }),
  component: HomePage,
})

const testimonials = [
  {
    quote:
      "I've worn my Amani slides through two Nairobi seasons and they've only got better. The leather moulds to your foot.",
    name: 'Wanjiru K.',
    city: 'Nairobi',
  },
  {
    quote:
      "The kiondo arrived beautifully wrapped. It's the piece everyone asks about when I travel.",
    name: 'Leila H.',
    city: 'Mombasa',
  },
  {
    quote: 'Elegant without shouting. You can feel the hours in the weave.',
    name: 'Grace N.',
    city: 'Kisumu',
  },
]

function HomePage() {
  const { data: categories } = useQuery(categoriesQuery())
  const { data: featured, isLoading } = useQuery(
    productsQuery({ featured: true, per_page: 3 }),
  )
  const [email, setEmail] = useState('')

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="relative">
        <img
          src={hero}
          alt="A woman walking in handcrafted beaded leather sandals"
          width={1600}
          height={1200}
          className="h-[78vh] min-h-[30rem] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/45 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <p className="eyebrow">Handmade in Kenya</p>
              <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
                Handcrafted for the modern woman
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Leather cut by hand, sisal woven the slow way, beads threaded
                one at a time. Pieces made in small batches by a collective of
                women artisans.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/shop">Shop the collection</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Collections</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Made to be lived in
            </h2>
          </div>
          <Link
            to="/shop"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group relative overflow-hidden rounded-md"
            >
              <img
                src={c.image}
                alt={c.name}
                loading="lazy"
                width={1000}
                height={1250}
                className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-5">
                <h3 className="font-display text-2xl text-background">
                  {c.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <p className="eyebrow">New arrivals</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">
          Fresh from the workshop
        </h2>
        <div className="mt-10">
          <ProductGrid
            products={featured?.data}
            isLoading={isLoading}
            skeletonCount={3}
          />
        </div>
      </section>

      {/* Our craft */}
      <section className="bg-sand/70 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <img
            src={craft}
            alt="Artisans weaving sisal and stitching leather by hand"
            loading="lazy"
            width={1400}
            height={1000}
            className="rounded-md object-cover shadow-[var(--shadow-soft)]"
          />
          <div>
            <p className="eyebrow">Our craft</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Eighty hands, one atelier
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Every Kijani piece begins with a maker. Our sandals are cut and
              stitched in a small Nairobi workshop; our kiondos are woven in
              Machakos, where sisal is stripped, dyed with plant pigments and
              turned on a hand loom over several days.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              We pay above fair-trade rates, work in small batches, and put the
              maker's mark inside every piece. Slight variations are proof of
              the hand behind the work.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-6">
              {[
                ['40+', 'Women artisans'],
                ['3–5', 'Days per piece'],
                ['100%', 'Made in Kenya'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl">{value}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <p className="eyebrow">Worn and loved</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="rounded-lg border border-border bg-card p-7 shadow-[var(--shadow-soft)]"
            >
              <StarRating value={5} />
              <blockquote className="mt-4 font-display text-xl leading-snug">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 text-xs text-muted-foreground">
                {t.name} — {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-3xl px-4 pb-4 text-center sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">
          Letters from the atelier
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          New drops, restocks and stories from the makers. Once a month, never
          more.
        </p>
        <form
          className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            setEmail('')
            toast.success("You're on the list — asante sana.")
          }}
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
          />
          <Button type="submit">Subscribe</Button>
        </form>
      </section>
    </StoreLayout>
  )
}
