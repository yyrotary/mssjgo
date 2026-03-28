export default function manifest() {
  return {
    name: '심재고 (心齋庫)',
    short_name: '심재고',
    description: 'A premium repository of high-quality AI prompts',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
// removed second icon block
    ],
  }
}
