import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Catalyst - Scan & Go',
    short_name: 'Catalyst',
    description: 'Self-checkout system for modern supermarkets.',
    start_url: '/shopper/home',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#14B8A6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/x-icon',
      },
    ],
  };
}
