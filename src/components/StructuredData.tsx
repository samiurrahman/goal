import React from 'react';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'BreadcrumbList' | 'TravelAgency' | 'Product';
  data: any;
}

const StructuredData: React.FC<StructuredDataProps> = ({ type, data }) => {
  let structuredData = {};

  switch (type) {
    case 'Organization': {
      const org: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.name || 'Searchumrah',
        url: data.url || process.env.NEXT_PUBLIC_SITE_URL,
        description: data.description || 'Premium Umrah travel booking platform',
      };
      if (data.logo) org.logo = data.logo;
      if (data.telephone) {
        org.contactPoint = {
          '@type': 'ContactPoint',
          telephone: data.telephone,
          contactType: 'customer service',
          availableLanguage: ['en', 'ar'],
        };
      }
      if (Array.isArray(data.socialLinks) && data.socialLinks.length > 0) {
        org.sameAs = data.socialLinks;
      }
      structuredData = org;
      break;
    }

    case 'WebSite':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: data.name || 'Searchumrah',
        url: data.url || process.env.NEXT_PUBLIC_SITE_URL,
        description: data.description || 'Book Umrah packages online',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${
              data.url || process.env.NEXT_PUBLIC_SITE_URL
            }/packages?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };
      break;

    case 'BreadcrumbList':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: data.items.map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      };
      break;

    case 'TravelAgency':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'TravelAgency',
        name: data.name || 'Searchumrah',
        description: data.description,
        url: data.url,
        image: data.image,
        priceRange: data.priceRange || '$$',
        telephone: data.telephone,
        address: data.address,
      };
      break;

    case 'Product':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name,
        description: data.description,
        image: data.image,
        brand: {
          '@type': 'Brand',
          name: data.brand || 'Searchumrah',
        },
        offers: {
          '@type': 'Offer',
          url: data.url,
          priceCurrency: data.currency || 'USD',
          price: data.price,
          priceValidUntil: data.priceValidUntil,
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: data.seller || 'Searchumrah',
          },
        },
        aggregateRating: data.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: data.rating.value,
              reviewCount: data.rating.count,
            }
          : undefined,
      };
      break;

    default:
      structuredData = data;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default StructuredData;
