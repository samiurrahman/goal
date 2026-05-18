import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BLOG_POSTS } from '@/content/blog/registry';
import { BLOG_CATEGORY_LABEL } from '@/content/blog/types';

// Blog index — static, no DB hit. Cornerstone-content phase: posts are
// hand-curated TSX modules in src/content/blog/posts. Adding a post
// requires editing src/content/blog/registry.ts, which auto-flows into
// this page, the sitemap, and the [slug] route.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

export const metadata: Metadata = {
  title: 'Umrah Travel Guide — Tips, How-Tos, and Planning Articles',
  description:
    'In-depth guides to Umrah from India — visa process, costs, best time to travel, rituals, and the difference between Hajj and Umrah. Written for Indian pilgrims.',
  keywords: [
    'Umrah blog',
    'Umrah guide',
    'Umrah tips India',
    'Umrah travel articles',
    'how to perform Umrah',
    'Umrah planning',
  ],
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: 'Umrah Travel Guide',
    description:
      'In-depth guides to Umrah from India — visa, cost, timing, rituals.',
    siteName: 'Searchumrah',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umrah Travel Guide',
    description: 'In-depth guides to Umrah from India.',
  },
};

const BlogIndexPage = () => {
  const posts = BLOG_POSTS;
  const featured = posts[0];
  const rest = posts.slice(1);

  // CollectionPage + Blog + ItemList + BreadcrumbList — Google reads
  // multiple JSON-LD blocks on the same page and merges them into a single
  // entity graph. Blog type signals to Google this is editorial content
  // rather than a transactional or listing page.
  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Searchumrah Blog',
    url: `${SITE_URL}/blog`,
    description:
      'In-depth guides to Umrah from India — visa, cost, timing, and rituals.',
    publisher: {
      '@type': 'Organization',
      name: 'Searchumrah',
      url: SITE_URL,
    },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      author: { '@type': 'Person', name: p.author.name },
    })),
  };
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: posts.length,
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/blog/${p.slug}`,
      name: p.title,
    })),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
    ],
  };

  return (
    <main className="nc-BlogIndexPage relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* ============== HERO ============== */}
      <section
        className="relative text-white"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, rgb(var(--c-primary-700)) 0%, rgb(var(--c-primary-900)) 70%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="container relative z-10 pt-10 pb-10 lg:pt-12 lg:pb-14">
          <nav className="mb-5 text-xs text-primary-200" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li className="text-white">Blog</li>
            </ol>
          </nav>
          <h1 className="font-light tracking-tight leading-[1.05] text-[28px] sm:text-[40px] lg:text-[52px] max-w-[22ch]">
            Umrah travel <em className="not-italic text-primary-200">guide</em>
          </h1>
          <p className="mt-4 text-base lg:text-[17px] leading-relaxed text-primary-100 max-w-[62ch]">
            In-depth, honest guides to performing Umrah from India. Written by
            people who have made the journey, for people who are planning it.
          </p>
        </div>
      </section>

      {/* ============== FEATURED POST ============== */}
      {featured ? (
        <section className="container py-10 lg:py-14">
          <Link
            href={`/blog/${featured.slug}`}
            className="group block rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-400 hover:shadow-md transition p-6 lg:p-8"
          >
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.06em]">
                Featured
              </span>
              <span>{BLOG_CATEGORY_LABEL[featured.category]}</span>
              <span aria-hidden>·</span>
              <span>{featured.readingMinutes} min read</span>
            </div>
            <h2 className="mt-3 text-2xl lg:text-[32px] font-thin leading-[1.15] tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-primary-800 dark:group-hover:text-primary-300">
              {featured.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-[68ch]">
              {featured.description}
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary-700 dark:text-primary-300 group-hover:underline">
              Read full guide →
            </span>
          </Link>
        </section>
      ) : null}

      {/* ============== POST LIST ============== */}
      <section className="container pb-14 lg:pb-20">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-4">
          All guides
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {rest.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group block h-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-400 hover:shadow-md transition p-5 lg:p-6"
              >
                <div className="flex items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                  <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 text-[11px] font-medium">
                    {BLOG_CATEGORY_LABEL[p.category]}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{p.readingMinutes} min read</span>
                </div>
                <h3 className="mt-2.5 text-lg lg:text-xl font-semibold leading-snug text-neutral-900 dark:text-neutral-100 group-hover:text-primary-800 dark:group-hover:text-primary-300">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-3">
                  {p.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default BlogIndexPage;
