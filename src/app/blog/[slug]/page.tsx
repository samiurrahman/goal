import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getBlogPost, getRelatedPosts } from '@/content/blog/registry';
import { BLOG_CATEGORY_LABEL } from '@/content/blog/types';

export const revalidate = 3600;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

// dynamicParams=false → unknown slugs 404 rather than rendering the [slug]
// template empty. Same pattern as the city/facet pages.
export const dynamicParams = false;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

type PageParams = { params: { slug: string } };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  const canonical = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: `${SITE_URL}${canonical}`,
      title: post.title,
      description: post.description,
      siteName: 'Searchumrah',
      locale: 'en_IN',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author.name],
      section: BLOG_CATEGORY_LABEL[post.category],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    other: {
      'article:published_time': post.publishedAt,
      'article:modified_time': post.updatedAt || post.publishedAt,
      'article:author': post.author.name,
      'article:section': BLOG_CATEGORY_LABEL[post.category],
    },
  };
}

const BlogPostPage = ({ params }: PageParams) => {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(post);
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;

  // BlogPosting (Article subtype) + FAQPage + BreadcrumbList. Together
  // these tell Google: editorial article, with structured FAQs eligible for
  // SERP rich results, sitting under /blog in the site hierarchy.
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    name: post.title,
    description: post.description,
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      ...(post.author.role ? { jobTitle: post.author.role } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Searchumrah',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
    },
    articleSection: BLOG_CATEGORY_LABEL[post.category],
    inLanguage: 'en-IN',
    timeRequired: `PT${post.readingMinutes}M`,
  };

  const faqLd =
    post.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const formattedDate = (() => {
    if (!post.publishedAt) return '';
    const d = new Date(post.publishedAt);
    if (Number.isNaN(d.getTime())) return post.publishedAt;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  })();

  const PostBody = post.Body;

  return (
    <main className="nc-BlogPostPage relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* ============== HEADER ============== */}
      <header className="container pt-8 lg:pt-12 pb-6 lg:pb-8">
        <nav className="mb-5 text-xs text-neutral-500 dark:text-neutral-400" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-200">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/blog" className="hover:text-neutral-900 dark:hover:text-neutral-200">
                Blog
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="text-neutral-800 dark:text-neutral-200 truncate max-w-[50ch]">
              {post.h1}
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.06em]">
              {BLOG_CATEGORY_LABEL[post.category]}
            </span>
            <span>{post.readingMinutes} min read</span>
            <span aria-hidden>·</span>
            <span>{formattedDate}</span>
          </div>

          <h1 className="text-[30px] sm:text-[40px] lg:text-[48px] font-thin tracking-tight leading-[1.1] text-neutral-900 dark:text-neutral-100">
            {post.h1}
          </h1>

          <p className="mt-4 text-base lg:text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {post.description}
          </p>

          <div className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">
            By <span className="font-medium text-neutral-700 dark:text-neutral-200">{post.author.name}</span>
            {post.author.role ? <span> · {post.author.role}</span> : null}
          </div>
        </div>
      </header>

      {/* ============== BODY ============== */}
      <article className="container pb-12 lg:pb-16">
        <div className="prose prose-neutral dark:prose-invert max-w-3xl prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-[26px] prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3 prose-p:text-[16px] prose-p:leading-[1.75] prose-li:my-1.5 prose-a:text-primary-700 dark:prose-a:text-primary-300 prose-table:text-sm prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800">
          <PostBody />
        </div>
      </article>

      {/* ============== FAQ ============== */}
      {post.faqs.length > 0 ? (
        <section className="container py-10 lg:py-14 border-t border-neutral-200 dark:border-neutral-700">
          <div className="max-w-3xl">
            <h2 className="text-2xl lg:text-[28px] font-thin tracking-tight text-neutral-900 dark:text-neutral-100">
              Frequently asked questions
            </h2>
            <div className="mt-6 grid gap-4">
              {post.faqs.map((f) => (
                <details
                  key={f.question}
                  className="group rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer text-[15px] lg:text-base font-semibold text-neutral-900 dark:text-neutral-100 list-none">
                    {f.question}
                    <span className="ml-auto flex-shrink-0 text-neutral-400 group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm lg:text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {f.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============== RELATED POSTS ============== */}
      {related.length > 0 ? (
        <section className="bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-700 py-12 lg:py-16">
          <div className="container">
            <h2 className="text-xl lg:text-2xl font-thin tracking-tight text-neutral-900 dark:text-neutral-100">
              Related guides
            </h2>
            <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group block h-full rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:shadow-sm transition p-5"
                  >
                    <div className="flex items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400 mb-2">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 text-[11px] font-medium">
                        {BLOG_CATEGORY_LABEL[p.category]}
                      </span>
                      <span>{p.readingMinutes} min</span>
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100 group-hover:text-primary-800 dark:group-hover:text-primary-300">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
                      {p.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ============== CTA ============== */}
      <section className="container py-12 lg:py-16">
        <div className="rounded-3xl bg-primary-900 text-white p-8 lg:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-[28px] font-thin tracking-tight">
            Ready to plan your Umrah?
          </h2>
          <p className="mt-3 text-primary-200 leading-relaxed max-w-[52ch] mx-auto">
            Browse verified Umrah packages from KYC-checked Indian travel
            agents. Compare prices, read real reviews, contact the agent
            directly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-primary-900 text-sm font-semibold hover:bg-primary-50"
            >
              Browse Umrah packages
            </Link>
            <Link
              href="/agencies"
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15"
            >
              All verified agencies
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default BlogPostPage;
