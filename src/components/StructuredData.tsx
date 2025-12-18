import React from 'react';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'BreadcrumbList' | 'TravelAgency' | 'Product';
  data: any;
}

const StructuredData: React.FC<StructuredDataProps> = ({ type, data }) => {
  let structuredData = {};

  switch (type) {
    case 'Organization':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.name || 'Hajjscanner',
        url: data.url || process.env.NEXT_PUBLIC_SITE_URL,
        logo: data.logo || `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
        description: data.description || 'Premium Hajj & Umrah travel booking platform',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: data.telephone || '+1-XXX-XXX-XXXX',
          contactType: 'customer service',
          availableLanguage: ['en', 'ar'],
        },
        sameAs: data.socialLinks || [],
      };
      break;

    case 'WebSite':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: data.name || 'Hajjscanner',
        url: data.url || process.env.NEXT_PUBLIC_SITE_URL,
        description: data.description || 'Book Hajj and Umrah packages online',
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
        name: data.name || 'Hajjscanner',
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
          name: data.brand || 'Hajjscanner',
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
            name: data.seller || 'Hajjscanner',
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
