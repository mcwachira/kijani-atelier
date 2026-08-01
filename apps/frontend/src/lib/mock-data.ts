import type {
  Category,
  Message,
  Order,
  OrderStatus,
  OrderStatusEvent,
  Product,
  Review,
} from '@/types'

import sandals from '@/assets/cat-sandals.jpg'
import kiondos from '@/assets/cat-kiondos.jpg'
import bags from '@/assets/cat-bags.jpg'
import accessories from '@/assets/cat-accessories.jpg'

export const categoryImages = { sandals, kiondos, bags, accessories }

export const categories: Category[] = [
  {
    id: 1,
    name: 'Sandals',
    slug: 'sandals',
    description: 'Hand-cut leather and beaded sandals, stitched sole to strap.',
    image: sandals,
    products_count: 4,
  },
  {
    id: 2,
    name: 'Kiondos',
    slug: 'kiondos',
    description:
      'Sisal baskets woven the slow way, finished in vegetable-tanned leather.',
    image: kiondos,
    products_count: 3,
  },
  {
    id: 3,
    name: 'Woven Handbags',
    slug: 'handbags',
    description: 'Raffia and leather bags for the everyday and the evening.',
    image: bags,
    products_count: 3,
  },
  {
    id: 4,
    name: 'Accessories',
    slug: 'accessories',
    description: 'Brass, bone and glass-bead pieces made one at a time.',
    image: accessories,
    products_count: 2,
  },
]

const cat = (slug: string) => categories.find((c) => c.slug === slug)!

type Seed = {
  name: string
  price: number
  category: string
  image: string
  materials: Product['materials']
  sizes: string[]
  isNew?: boolean
  compare?: number
}

const seeds: Seed[] = [
  {
    name: 'Amani Beaded Slide',
    price: 6800,
    category: 'sandals',
    image: sandals,
    materials: ['leather', 'beads'],
    sizes: ['36', '37', '38', '39', '40', '41'],
    isNew: true,
  },
  {
    name: 'Nia T-Strap Sandal',
    price: 7400,
    category: 'sandals',
    image: sandals,
    materials: ['leather'],
    sizes: ['36', '37', '38', '39', '40'],
  },
  {
    name: 'Sanaa Ankle Wrap',
    price: 8900,
    category: 'sandals',
    image: sandals,
    materials: ['leather', 'beads'],
    sizes: ['37', '38', '39', '40', '41'],
    compare: 10500,
  },
  {
    name: 'Zuri Flat Sandal',
    price: 5900,
    category: 'sandals',
    image: sandals,
    materials: ['leather'],
    sizes: ['36', '37', '38', '39'],
  },
  {
    name: 'Kiondo Classic Tote',
    price: 9500,
    category: 'kiondos',
    image: kiondos,
    materials: ['woven', 'leather'],
    sizes: [],
    isNew: true,
  },
  {
    name: 'Kiondo Ochre Stripe',
    price: 10800,
    category: 'kiondos',
    image: kiondos,
    materials: ['woven'],
    sizes: [],
  },
  {
    name: 'Kiondo Petite Market',
    price: 7200,
    category: 'kiondos',
    image: kiondos,
    materials: ['woven', 'leather'],
    sizes: [],
  },
  {
    name: 'Malaika Raffia Shoulder',
    price: 11500,
    category: 'handbags',
    image: bags,
    materials: ['woven', 'leather'],
    sizes: [],
    isNew: true,
  },
  {
    name: 'Dunia Woven Clutch',
    price: 6400,
    category: 'handbags',
    image: bags,
    materials: ['woven'],
    sizes: [],
  },
  {
    name: 'Tala Structured Basket',
    price: 13200,
    category: 'handbags',
    image: bags,
    materials: ['woven', 'leather'],
    sizes: [],
    compare: 15000,
  },
  {
    name: 'Imani Brass Cuff',
    price: 4200,
    category: 'accessories',
    image: accessories,
    materials: ['brass', 'beads'],
    sizes: [],
  },
  {
    name: 'Rehema Bead Necklace',
    price: 3800,
    category: 'accessories',
    image: accessories,
    materials: ['beads', 'brass'],
    sizes: [],
    isNew: true,
  },
]

export const products: Product[] = seeds.map((s, i) => ({
  id: i + 1,
  name: s.name,
  slug: s.name.toLowerCase().replace(/\s+/g, '-'),
  price: s.price,
  compare_at_price: s.compare ?? null,
  category: cat(s.category),
  description:
    'A quiet, considered piece made in small batches. Each one is cut, stitched and finished by hand, so no two are ever identical — small variations are the signature of the maker, not a flaw.',
  craft_note:
    'Made over three to five days by artisans in Nairobi and Machakos, using vegetable-tanned leather and locally sourced sisal.',
  materials: s.materials,
  sizes: s.sizes,
  images: [s.image, s.image, s.image],
  stock: 4 + ((i * 7) % 20),
  rating: 4 + (i % 3) * 0.3,
  reviews_count: 6 + ((i * 5) % 40),
  is_new: !!s.isNew,
  created_at: new Date(2025, 11 - (i % 10), 3 + i).toISOString(),
}))

export const reviews: Review[] = products.flatMap((p) => [
  {
    id: p.id * 10 + 1,
    product_id: p.id,
    author: 'Wanjiru K.',
    rating: 5,
    body: 'The craftsmanship is beautiful — the leather softened perfectly after a week. Worth every shilling.',
    created_at: '2026-05-12',
  },
  {
    id: p.id * 10 + 2,
    product_id: p.id,
    author: 'Amina O.',
    rating: 4,
    body: 'Elegant and comfortable. Shipping to Mombasa took three days, packaging was lovely.',
    created_at: '2026-04-28',
  },
])

const counties = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Kiambu',
  'Machakos',
  'Eldoret',
]

const ORDER_SEQUENCE: OrderStatus[] = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
]

const ORDER_PATH: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered']

const statusHistory = (
  final: OrderStatus,
  placedAt: string,
): OrderStatusEvent[] => {
  const chain =
    final === 'cancelled'
      ? (['pending', 'cancelled'] as OrderStatus[])
      : ORDER_PATH.slice(0, ORDER_PATH.indexOf(final) + 1)
  const placed = new Date(placedAt)
  return chain.map((to, i, all) => ({
    id: i + 1,
    from: i === 0 ? null : all[i - 1],
    to,
    note:
      i === 0
        ? 'Order placed by customer.'
        : to === 'cancelled'
          ? 'Cancelled before dispatch.'
          : `Marked ${to}.`,
    actor: i === 0 ? 'System' : 'Admin',
    created_at: new Date(placed.getTime() + i * 36_000_000).toISOString(),
  }))
}

export const orders: Order[] = Array.from({ length: 14 }, (_, i) => {
  const p = products[i % products.length]
  const qty = 1 + (i % 3)
  const status = ORDER_SEQUENCE[i % ORDER_SEQUENCE.length]
  const created_at = new Date(2026, 6, 20 - i).toISOString()
  return {
    id: 1000 + i,
    reference: `KJ-${2600 + i}`,
    customer_name: [
      'Wanjiru Kamau',
      'Amina Osman',
      'Grace Njeri',
      'Leila Hassan',
      'Faith Mwikali',
    ][i % 5],
    email: 'customer@example.com',
    phone: '+254 7xx xxx xxx',
    county: counties[i % counties.length],
    town: [
      'Westlands',
      'Nyali',
      'Milimani',
      'Naka',
      'Ruaka',
      'Mlolongo',
      'Kapsoya',
    ][i % 7],
    address: 'P.O. Box 1123',
    payment_method: i % 3 === 0 ? 'card' : 'mpesa',
    status,
    total: p.price * qty,
    items: [
      {
        product_name: p.name,
        quantity: qty,
        price: p.price,
        size: p.sizes[0] ?? null,
      },
    ],
    status_history: statusHistory(status, created_at),
    created_at,
  }
})

export const messages: Message[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: ['Wanjiru Kamau', 'Amina Osman', 'Grace Njeri', 'Leila Hassan'][i % 4],
  email: 'hello@example.com',
  subject: [
    'Sizing question',
    'Wholesale enquiry',
    'Order KJ-2604',
    'Custom kiondo colours',
  ][i % 4],
  preview:
    "Hi, I wanted to ask about the fit of the Amani slide — I'm usually between sizes…",
  body: "Hi, I wanted to ask about the fit of the Amani slide — I'm usually between a 38 and 39. Would you recommend sizing up? Also, do you restock the ochre kiondo often? Thank you so much.",
  unread: i < 3,
  replies: [],
  created_at: new Date(2026, 6, 23 - i).toISOString(),
}))
