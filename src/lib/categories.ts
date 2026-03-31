export const CATEGORIES: Record<string, { label: string; keywords: string[] }> = {
  grocery: {
    label: 'Les courses',
    keywords: ['iga', 'maxi', 'metro', 'provigo', 'super c', 'pa ', 'adonis', 'intermarche', 'epicerie', 'grocery', 'marche', 'walmart', 'costco'],
  },
  restaurant: {
    label: 'Les restos',
    keywords: ['rest', 'cafe', 'bistro', 'pizza', 'sushi', 'tavern', 'brasserie', 'traiteur', 'cuisine', 'grill', 'diner', 'poke', 'ramen', 'thai', 'burger'],
  },
  bar_alcohol: {
    label: 'Alcool et bars',
    keywords: ['saq', 'lcbo', 'bar ', 'pub ', 'brew', 'wine', 'bier', 'lounge', 'tavern', 'dep ', 'depanneur'],
  },
  pharmacy: {
    label: 'La pharmacie',
    keywords: ['pharma', 'jean coutu', 'uniprix', 'familiprix', 'shoppers', 'drug mart'],
  },
  transport: {
    label: 'Le transport',
    keywords: ['uber', 'lyft', 'stm', 'taxi', 'parking', 'stationnement', 'bixi', 'communauto'],
  },
  subscriptions: {
    label: 'Les abonnements',
    keywords: ['spotify', 'netflix', 'disney', 'amazon prime', 'apple', 'google storage', 'youtube', 'openai', 'anthropic', 'github', 'figma', 'notion', 'linear', 'vercel'],
  },
  pet: {
    label: 'Les chats',
    keywords: ['vet', 'veterinaire', 'mondou', 'pet', 'animalerie', 'animaux'],
  },
  home: {
    label: 'La maison',
    keywords: ['ikea', 'canadian tire', 'home depot', 'reno', 'dollarama', 'home hardware'],
  },
}

export function detectCategory(name: string): string | null {
  const lower = (name || '').toLowerCase()
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return key
    }
  }
  return null
}
