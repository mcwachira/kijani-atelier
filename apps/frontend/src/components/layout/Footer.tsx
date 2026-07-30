import { Link, linkOptions } from '@tanstack/react-router'
import { Instagram, Mail, MapPin, Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-sand/60 text-sand-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2 lg:max-w-sm">
          <span className="font-display text-2xl">Kijani Atelier</span>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We work with a collective of women artisans across Nairobi, Machakos
            and the coast — hand-cutting leather, weaving sisal and threading
            glass beads into pieces made to be worn for years, not seasons.
          </p>
        </div>

        <div>
          <h3 className="eyebrow">Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {linkOptions(
              ['sandals', 'kiondos', 'handbags', 'accessories'].map((slug) => ({
                to: '/shop' as const,
                search: { category: slug },
              })),
            ).map((l, i) => (
              <li key={i}>
                <Link
                  to={l.to}
                  search={l.search}
                  className="capitalize text-muted-foreground transition-colors hover:text-foreground"
                >
                  {['sandals', 'kiondos', 'handbags', 'accessories'][i]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="eyebrow">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> Riverside Drive, Nairobi
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />{' '}
              <a href="tel:+254700000000" className="hover:text-foreground transition-colors">
                +254 700 000 000
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />{' '}
              <a href="mailto:hello@kijaniatelier.co.ke" className="hover:text-foreground transition-colors">
                hello@kijaniatelier.co.ke
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" />{' '}
              <a
                href="https://instagram.com/kijaniatelier"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                @kijaniatelier
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Kijani Atelier. Handmade in Kenya.</p>
          <p>Free delivery on orders above KSh 15,000</p>
        </div>
      </div>
    </footer>
  )
}
