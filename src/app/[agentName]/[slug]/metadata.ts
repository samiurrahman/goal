import { Metadata } from 'next';
import { supabase } from '@/utils/supabaseClient';
import { Package } from '@/data/types';

interface PageProps {
  params: { agentName: string; slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentName, slug } = params;

  // Fetch package details from Supabase
  const { data: packageData } = await supabase
    .from('packages')
    .select('*')
    .eq('slug', slug)
    .single();

  const pkg = packageData as Package | null;

  if (!pkg) {
    return {
      title: 'Package Not Found',
      description: 'The requested package could not be found.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hajjscanner.com';
  const packageUrl = `${baseUrl}/${agentName}/${slug}`;

  return {
    title: `${pkg.title} - ${pkg.total_duration_days} Days`,
    description:
      pkg.short_description ||
      `Book ${pkg.title} with ${pkg.agent_name}. ${pkg.total_duration_days} days package including ${pkg.makkah_days} days in Makkah and ${pkg.madinah_days} days in Madinah. Starting from ${pkg.currency}${pkg.price_per_person} per person.`,
    keywords: [
      pkg.title,
      `${pkg.total_duration_days} days package`,
      pkg.agent_name || '',
      'Hajj package',
      'Umrah package',
      pkg.departure_city || '',
      pkg.makkah_hotel_name || '',
      pkg.madinah_hotel_name || '',
    ],
    openGraph: {
      title: `${pkg.title} - ${pkg.currency}${pkg.price_per_person}`,
      description: pkg.short_description || `${pkg.total_duration_days} days Hajj/Umrah package`,
      type: 'website',
      url: packageUrl,
      images: [
        {
          url: pkg.thumbnail_url || `${baseUrl}/default-package.jpg`,
          width: 1200,
          height: 630,
          alt: pkg.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pkg.title} - ${pkg.currency}${pkg.price_per_person}`,
      description: pkg.short_description || `${pkg.total_duration_days} days package`,
      images: [pkg.thumbnail_url || `${baseUrl}/default-package.jpg`],
    },
    alternates: {
      canonical: packageUrl,
    },
  };
}

export { default } from './page';
// TODO: Create './PackageDetailClient.tsx' or correct the path if the file exists under a different name.
