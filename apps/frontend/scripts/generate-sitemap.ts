
import { writeFileSync } from 'node:fs'

const API_BASE_URL =
  process.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
const SITE_URL = process.env.SITE_URL ?? 'https://kijaniatelier.com'

async function generateSitemap() {
  const productsRes = await fetch(`${API_BASE_URL}/products?per_page=100`)
  const { data: products } = await productsRes.json()

  const categoriesRes = await fetch(`${API_BASE_URL}/categories`)
  const { data: categories } = await categoriesRes.json()

  // A reachable-but-empty API (e.g. a fresh/unseeded database) would
  // otherwise "succeed" and silently overwrite a sitemap that had real
  // URLs with one that only has the 4 static pages — worse than leaving
  // the stale-but-populated file alone. Treat that case as a failure too.
  if (!products?.length || !categories?.length) {
    throw new Error(
      `API returned ${products?.length ?? 0} products and ${categories?.length ?? 0} categories — refusing to write a near-empty sitemap`,
    )
  }

  const staticUrls = ['', '/shop', '/about', '/messages']

  const urls = [
    ...staticUrls.map((path) => `${SITE_URL}${path}`),
    ...categories.map(
      (c: { slug: string }) => `${SITE_URL}/shop?category=${c.slug}`,
    ),
    ...products.map((p: { slug: string }) => `${SITE_URL}/products/${p.slug}`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`

  writeFileSync('public/sitemap.xml', xml)
  console.log(`Sitemap written with ${urls.length} URLs`)
}

generateSitemap().catch((err) => {
  // Non-fatal by design: this runs as part of `pnpm build`, and the API
  // may not be reachable from every build environment (e.g. a CI runner
  // building the frontend before/without the backend up). Warn and leave
  // the previously-committed public/sitemap.xml in place rather than
  // failing the whole build over a stale-but-present sitemap.
  console.warn(
    'Skipping sitemap regeneration — could not reach the API:',
    err instanceof Error ? err.message : err,
  )
})
