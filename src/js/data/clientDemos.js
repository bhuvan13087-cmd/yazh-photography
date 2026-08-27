// Sample Client Proofing Galleries for Private Access Demonstration
export const DEMO_CLIENT_GALLERIES = [
  {
    pin: '1234',
    accessCode: 'KARTHIK-ANANYA',
    clientName: 'Karthik & Ananya',
    eventTitle: 'Traditional Wedding & Reception',
    date: 'August 18, 2026',
    location: 'Chennai Grand Convention',
    coverImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=85',
    totalPhotos: 8,
    packageTier: 'Standard package',
    photos: [
      {
        id: 'cl-01',
        title: 'Garland Exchange Muhurtham',
        thumbnail: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
        image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=85',
        selected: true
      },
      {
        id: 'cl-02',
        title: 'Golden Sunset Couple Portrait',
        thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85',
        selected: true
      },
      {
        id: 'cl-03',
        title: 'Candid Joyful Laughter',
        thumbnail: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
        image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85',
        selected: false
      },
      {
        id: 'cl-04',
        title: 'Wedding Rings & Details',
        thumbnail: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80',
        image: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1600&q=85',
        selected: true
      }
    ]
  }
];

export const CLIENT_DEMO_GALLERIES = {
  '1234': {
    title: 'Karthik & Ananya Wedding Proofs',
    names: 'Karthik & Ananya',
    date: 'August 18, 2026',
    coverImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=85',
    photos: DEMO_CLIENT_GALLERIES[0].photos
  }
};
