import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Searchumrah — Compare Umrah Packages',
    short_name: 'Searchumrah',
    description:
      'Compare Umrah packages from verified travel agents. Transparent pricing, real reviews.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4338CA',
    orientation: 'portrait',
    categories: ['travel', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
