import { createFileRoute, Link } from '@tanstack/react-router'

import { StoreLayout } from '@/components/layout/StoreLayout'
import { Button } from '@/components/ui/button'

import craft from '@/assets/craft.jpg'
import hero from '@/assets/hero.jpg'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: 'About — Kijani Atelier' },
      {
        name: 'description',
        content:
          'Kijani Atelier works with a collective of 40+ women artisans across Nairobi, Machakos and the Kenyan coast, hand-cutting leather and weaving sisal into sandals, kiondos and bags made to last.',
      },
      { property: 'og:title', content: 'About — Kijani Atelier' },
      {
        property: 'og:description',
        content:
          'Handmade in Kenya by a collective of women artisans — the story behind every Kijani piece.',
      },
    ],
  }),
  component: About,
})

function About() {
  return (
    <StoreLayout>
      <section className="relative">
        <img
          src={hero}
          alt="A woman walking in handcrafted beaded leather sandals"
          loading="eager"
          width={1600}
          height={800}
          className="h-[50vh] min-h-[20rem] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </section>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="eyebrow">About Kijani Atelier</p>
        <h1 className="mt-2 font-display text-4xl lg:text-5xl">
          Handmade in Kenya, worn for years
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Kijani Atelier works with a collective of women artisans across
          Nairobi, Machakos and the Kenyan coast — hand-cutting leather,
          weaving sisal and threading glass beads into sandals, kiondos and
          bags made to be worn for years, not seasons.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Every piece starts with a maker, not a factory line. Sandals are
          cut and stitched in a small Nairobi workshop; kiondos are woven in
          Machakos, where sisal is stripped, dyed with plant pigments and
          turned on a hand loom over several days. We pay above fair-trade
          rates, work in small batches, and put the maker's mark inside
          every piece — the slight variations from one bag or sandal to the
          next are proof of the hand behind the work, not a flaw.
        </p>
      </div>

      <section className="bg-sand/70 py-20">
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
            <p className="eyebrow">Eighty hands, one atelier</p>
            <dl className="mt-6 grid grid-cols-3 gap-6">
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
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
              Free delivery on orders above KSh 15,000, countrywide in 3–5
              working days. Questions about sizing, care, or a custom piece?
              We reply within a day.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">Shop the collection</Link>
            </Button>
          </div>
        </div>
      </section>
    </StoreLayout>
  )
}
