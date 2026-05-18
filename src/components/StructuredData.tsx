import React from 'react';

interface StructuredDataProps {
  type:
    | 'Organization'
    | 'WebSite'
    | 'WebPage'
    | 'BreadcrumbList'
    | 'TravelAgency'
    | 'Product'
    | 'ItemList';
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
      if (data.image) org.image = data.image;
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

    case 'WebSite': {
      const site: Record<string, unknown> = {
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
      if (data.image) site.image = data.image;
      structuredData = site;
      break;
    }

    case 'WebPage': {
      // Primary signal to Google for SERP thumbnail selection. `image` +
      // `primaryImageOfPage` together let Google's image picker associate a
      // specific image with this URL even when that image isn't rendered
      // inline in the page DOM (our homepage's hero is a CSS-only skyline,
      // so without this signal Google rasterizes the inline SVG instead).
      const page: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: data.name,
        url: data.url,
        description: data.description,
      };
      if (data.image) {
        page.image = data.image;
        page.primaryImageOfPage = {
          '@type': 'ImageObject',
          url: data.image,
        };
      }
      if (data.inLanguage) page.inLanguage = data.inLanguage;
      if (data.isPartOf) page.isPartOf = data.isPartOf;
      structuredData = page;
      break;
    }

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

    case 'ItemList': {
      // Generic ordered list — used on the homepage to surface the
      // departure-city index as a machine-readable list of related pages.
      // Google may render this as a sitelink-style cluster on SERPs.
      const list: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: (data.items || []).map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: item.url,
        })),
      };
      if (data.name) list.name = data.name;
      if (data.description) list.description = data.description;
      if (typeof data.numberOfItems === 'number') list.numberOfItems = data.numberOfItems;
      structuredData = list;
      break;
    }

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
