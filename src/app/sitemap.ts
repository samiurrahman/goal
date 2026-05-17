import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabaseClient';
import { SEO_CITIES } from '@/lib/seo/cities';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

  // Static routes — priority/changeFrequency are hints to crawlers about how
  // important and how volatile a page is relative to others on this site.
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/packages`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/refund-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Programmatic city landing pages. Priority sits between /packages (0.9)
  // and individual package detail pages (0.8) — these are the city-level
  // hubs that absorb long-tail "umrah from <city>" queries and funnel into
  // both the listing and detail pages.
  const cityRoutes: MetadataRoute.Sitemap = SEO_CITIES.map((c) => ({
    url: `${baseUrl}/umrah-packages-from-${c.urlSlug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  // Agents → /{slug}
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('slug, created_at')
      .not('slug', 'is', null);

    if (error) {
      console.warn('[sitemap] agents query failed:', error.message);
    } else if (agents) {
      console.log(`[sitemap] agents fetched: ${agents.length}`);
      for (const agent of agents) {
        if (!agent.slug) continue;
        dynamicRoutes.push({
          url: `${baseUrl}/${agent.slug}`,
          lastModified: new Date(agent.created_at || Date.now()),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch (e) {
    console.warn('[sitemap] agents fetch threw:', e instanceof Error ? e.message : String(e));
  }

  // Packages → /{agentSlug}/{packageSlug}
  // Use the packages_with_agent view which joins packages → agents on
  // packages.agent_id = agents.auth_user_id (per 20260512_normalize_package_agent_fields.sql).
  // The view doesn't expose agents.slug, so we query both and join in memory —
  // but in a single round-trip via PostgREST's foreign-table embed.
  try {
    const { data: packages, error } = await supabase
      .from('packages')
      .select('slug, created_at, published, agents:agent_id(slug)')
      .not('slug', 'is', null)
      .or('published.is.null,published.eq.true');

    if (error) {
      console.warn('[sitemap] packages query failed:', error.message);
    } else if (packages) {
      console.log(`[sitemap] packages fetched: ${packages.length}`);
      for (const pkg of packages as Array<{
        slug: string | null;
        created_at: string | null;
        agents: { slug: string | null } | { slug: string | null }[] | null;
      }>) {
        if (!pkg.slug) continue;
        const agent = Array.isArray(pkg.agents) ? pkg.agents[0] : pkg.agents;
        const agentSlug = agent?.slug;
        if (!agentSlug) continue;
        dynamicRoutes.push({
          url: `${baseUrl}/${agentSlug}/${pkg.slug}`,
          lastModified: new Date(pkg.created_at || Date.now()),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch (e) {
    console.warn('[sitemap] packages fetch threw:', e instanceof Error ? e.message : String(e));
  }

  console.log(`[sitemap] total dynamic routes: ${dynamicRoutes.length}`);
  return [...staticRoutes, ...cityRoutes, ...dynamicRoutes];
}
