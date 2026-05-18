import type { ComponentType } from 'react';

// One BlogPost per file under src/content/blog/posts. Body is a React
// component (not raw markdown / MDX) so each post can pull in real Tailwind
// classes, internal Link components, and Image components without round-
// tripping through an MDX compiler. Trade-off: posts aren't editable by a
// non-developer — fine for the cornerstone-content phase, will need
// rethinking when we hand writing duties to a content team.

export type BlogCategory =
  | 'umrah-guide'
  | 'visa-and-docs'
  | 'cost-and-planning'
  | 'rituals-and-spiritual'
  | 'travel-tips';

export type BlogFaq = { question: string; answer: string };

export type BlogPost = {
  slug: string;
  title: string;
  // Short, SEO-aware description used for meta description, OG description,
  // index card subtitle, and the in-page lede.
  description: string;
  // Headline shown on the post page itself. Often slightly different from
  // the SEO title — punchier, less keyword-front-loaded.
  h1: string;
  category: BlogCategory;
  publishedAt: string; // ISO date e.g. "2026-05-18"
  updatedAt?: string; // ISO date — when meaningful content was last changed
  author: { name: string; role?: string };
  // Estimated read time in minutes. Hand-tuned per post (don't auto-compute
  // — Body is JSX, not a string, so word counting is unreliable).
  readingMinutes: number;
  // Used for the FAQPage JSON-LD block at the bottom of each post.
  faqs: BlogFaq[];
  // Slugs of related posts shown at the bottom. Keep curated, not algorithmic.
  related: string[];
  // The article body. Renders inside a centered prose container — the
  // component should emit semantic HTML (h2/h3/p/ul) and can import any
  // shared components from src/components or src/shared.
  Body: ComponentType;
};

export const BLOG_CATEGORY_LABEL: Record<BlogCategory, string> = {
  'umrah-guide': 'Umrah Guide',
  'visa-and-docs': 'Visa & Documents',
  'cost-and-planning': 'Cost & Planning',
  'rituals-and-spiritual': 'Rituals & Spiritual',
  'travel-tips': 'Travel Tips',
};
