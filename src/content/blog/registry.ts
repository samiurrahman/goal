// Single source of truth for the blog. Each post is a self-contained module
// in ./posts/<slug>.tsx that default-exports a BlogPost. Adding a post is two
// steps: drop the file in ./posts/ and add the import here. We deliberately
// do NOT auto-discover via require.context — explicit imports keep the slug
// list traceable, make sitemap + generateStaticParams build-time pure, and
// let TypeScript catch a missing post at the import site instead of at runtime.

import type { BlogPost } from './types';
import hajjVsUmrah from './posts/difference-between-hajj-and-umrah';
import visaProcess from './posts/umrah-visa-process-for-indians';
import costGuide from './posts/umrah-cost-from-india';
import bestTime from './posts/best-time-for-umrah';
import completeGuide from './posts/complete-guide-to-performing-umrah';

// Sort order: newest first by publishedAt. For now all posts share the same
// publishedAt so the order matches the import order — when posts are
// published over time this still sorts correctly.
export const BLOG_POSTS: BlogPost[] = [
  hajjVsUmrah,
  visaProcess,
  costGuide,
  bestTime,
  completeGuide,
].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

const BLOG_POSTS_BY_SLUG: Map<string, BlogPost> = new Map(
  BLOG_POSTS.map((p) => [p.slug, p])
);

export function getBlogPost(slug: string | undefined | null): BlogPost | undefined {
  if (!slug || typeof slug !== 'string') return undefined;
  return BLOG_POSTS_BY_SLUG.get(slug.toLowerCase());
}

// Pick the post objects for the slugs listed in `post.related`. Returns in
// the order they're listed (curated, not algorithmic). Silently skips
// unknown slugs — defensive in case a `related` slug is removed before the
// related-from list is updated.
export function getRelatedPosts(post: BlogPost): BlogPost[] {
  return post.related
    .map((slug) => BLOG_POSTS_BY_SLUG.get(slug))
    .filter((p): p is BlogPost => Boolean(p));
}
