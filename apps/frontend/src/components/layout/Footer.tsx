import { Link } from '@tanstack/react-router'
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
            {['sandals', 'kiondos', 'handbags', 'accessories'].map((slug) => (
              <li key={slug}>
                <Link
                  to="/shop"
                  search={{ category: slug } as never}
                  className="capitalize text-muted-foreground transition-colors hover:text-foreground"
                >
                  {slug}
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
              <Phone className="h-4 w-4 shrink-0" /> +254 700 000 000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> hello@kijaniatelier.co.ke
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" /> @kijaniatelier
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
