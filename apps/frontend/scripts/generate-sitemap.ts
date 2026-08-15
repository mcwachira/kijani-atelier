
import { writeFileSync } from 'node:fs'

const API_BASE_URL =
  process.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
const SITE_URL = process.env.SITE_URL ?? 'https://kijaniatelier.com'

async function generateSitemap() {
  const productsRes = await fetch(`${API_BASE_URL}/products?per_page=100`)
  const { data: products } = await productsRes.json()

  const categoriesRes = await fetch(`${API_BASE_URL}/categories`)
  const { data: categories } = await categoriesRes.json()

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
  console.error('Failed to generate sitemap:', err)
  process.exit(1)
})
