// Fine Art Prints & Store Catalog (INR Base)
export const PRINT_SIZES = [
  { id: '8x12', name: '8" × 12"', cm: '20 × 30 cm', multiplier: 1.0, basePriceINR: 3500 },
  { id: '12x18', name: '12" × 18"', cm: '30 × 45 cm', multiplier: 1.6, basePriceINR: 5500 },
  { id: '16x24', name: '16" × 24"', cm: '40 × 60 cm', multiplier: 2.4, basePriceINR: 8500 },
  { id: '20x30', name: '20" × 30"', cm: '50 × 75 cm', multiplier: 3.5, basePriceINR: 12500 },
  { id: '24x36', name: '24" × 36"', cm: '60 × 90 cm', multiplier: 4.8, basePriceINR: 18000 },
  { id: '36x12', name: '36" × 12" (Panoramic)', cm: '90 × 30 cm', multiplier: 3.2, basePriceINR: 14000 }
];

export const PRINT_MEDIA = [
  {
    id: 'photo-rag',
    name: 'Hahnemühle Archival Photo Rag 308g',
    description: '100% cotton museum-grade paper with a soft velvet matte finish and deep blacks.',
    priceAddINR: 0,
    badge: 'Museum Choice'
  },
  {
    id: 'baryta',
    name: 'Canson Baryta Prestige Archival',
    description: 'Satin gloss surface with exceptional tonal range and photographic contrast.',
    priceAddINR: 1500,
    badge: 'Gallery Choice'
  },
  {
    id: 'metallic',
    name: 'Metallic Pearl High-Gloss',
    description: 'Iridescent pearlescent finish for vibrant wedding nightscapes and stage ceremonies.',
    priceAddINR: 2000,
    badge: 'Vibrant'
  },
  {
    id: 'acrylic',
    name: 'Diamond Acrylic Glass Mount',
    description: 'Polished optical acrylic with aluminum backing for a frameless contemporary look.',
    priceAddINR: 4500,
    badge: 'Ultra Luxury'
  },
  {
    id: 'canvas',
    name: 'Archival Canvas Gallery Wrap',
    description: 'Stretched heavy-duty canvas over 1.5" kiln-dried pine wood bars.',
    priceAddINR: 2800,
    badge: 'Textured'
  }
];

export const FRAMING_OPTIONS = [
  {
    id: 'none',
    name: 'Unframed (Print Only)',
    description: 'Shipped in heavy-duty protective tube.',
    priceAddINR: 0,
    borderStyle: 'none'
  },
  {
    id: 'black-oak',
    name: 'Minimalist Matte Black Frame',
    description: 'Sleek solid wood with anti-glare protective glass.',
    priceAddINR: 2200,
    borderStyle: '10px solid #1a1a1a'
  },
  {
    id: 'natural-walnut',
    name: 'Handcrafted Natural Walnut Wood',
    description: 'Rich organic dark wood grain with museum glass.',
    priceAddINR: 3200,
    borderStyle: '12px solid #4a3321'
  },
  {
    id: 'antique-gold',
    name: 'Heritage Venetian Antique Gold',
    description: 'Ornate gold leaf finish for traditional wedding portraits.',
    priceAddINR: 3800,
    borderStyle: '12px solid #9e7b3b'
  },
  {
    id: 'white-ash',
    name: 'Contemporary White Ash',
    description: 'Clean modern gallery frame.',
    priceAddINR: 2200,
    borderStyle: '10px solid #ececec'
  }
];

export const MATTING_OPTIONS = [
  { id: 'none', name: 'Borderless (Full Bleed)', priceAddINR: 0 },
  { id: 'white-2in', name: '2" Pure White Museum Mat', priceAddINR: 800 },
  { id: 'cream-3in', name: '3" Warm Archival Cream Mat', priceAddINR: 1200 }
];

export const FINE_ART_PRINTS = [
  {
    id: 'print-01',
    title: 'The Sacred Garland Vow',
    subtitle: 'Traditional Tamil Wedding Muhurtham',
    category: 'Weddings',
    editionType: 'Limited Edition',
    editionCount: 25,
    editionsSold: 18,
    basePriceINR: 5500,
    rating: 5.0,
    reviewsCount: 38,
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '3:2',
    story: 'Captured during the sacred golden hour of the Muhurtham. The golden temple silks and joyful garland exchange reflect generations of timeless tradition.',
    camera: 'Sony α7R V · FE 85mm F1.4 GM · f/1.8 · 1/800s · ISO 100',
    tags: ['Wedding', 'Traditional', 'Candid', 'Bestseller'],
    featured: true
  },
  {
    id: 'print-02',
    title: 'Serenade at Golden Sunset',
    subtitle: 'Pre-Wedding Outdoor Shoot, Scenic Lakeside',
    category: 'Weddings',
    editionType: 'Open Edition',
    editionCount: null,
    editionsSold: 42,
    basePriceINR: 4500,
    rating: 5.0,
    reviewsCount: 29,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '3:2',
    story: 'A serene candid pre-wedding shoot captured during warm evening light by the water. True natural smiles and unspoken intimacy.',
    camera: 'Leica SL2 · 50mm Summilux f/1.4 · f/1.4 · 1/2000s · ISO 50',
    tags: ['Pre-Wedding', 'Outdoor', 'Couples', 'Golden Hour'],
    featured: true
  },
  {
    id: 'print-03',
    title: 'Ethereal Dawn at Reine',
    subtitle: 'Lofoten Archipelago, Norway',
    category: 'Landscapes',
    editionType: 'Limited Edition',
    editionCount: 25,
    editionsSold: 18,
    basePriceINR: 6500,
    rating: 5.0,
    reviewsCount: 28,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '3:2',
    story: 'Mirror stillness in the arctic fjord reflecting sheer granite peaks against glowing crimson cabins.',
    camera: 'Sony α7R V · FE 16-35mm F2.8 GM II · f/11 · 1.6s · ISO 50',
    tags: ['Landscapes', 'Nature', 'Travel'],
    featured: true
  },
  {
    id: 'print-04',
    title: 'Velvet Haute Couture',
    subtitle: 'Studio Editorial & Fashion',
    category: 'Portraits',
    editionType: 'Limited Edition',
    editionCount: 20,
    editionsSold: 14,
    basePriceINR: 5000,
    rating: 4.9,
    reviewsCount: 22,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '4:5',
    story: 'Chiaroscuro studio editorial exploration of feminine elegance and lighting sculpture.',
    camera: 'Sony α1 · FE 85mm F1.2 GM · f/1.4 · 1/400s · ISO 100',
    tags: ['Portrait', 'Fashion', 'Studio'],
    featured: false
  }
];
