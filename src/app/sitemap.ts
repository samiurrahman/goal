import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabaseClient';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

  // Static routes. We previously emitted priority/changeFrequency hints but
  // those fields are only typed in Next 13.5+ and Google ignores them anyway.
  // Bing still honors them; if/when Next is upgraded, they can be reintroduced.
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now },
    { url: `${baseUrl}/packages`, lastModified: now },
    { url: `${baseUrl}/about`, lastModified: now },
    { url: `${baseUrl}/contact`, lastModified: now },
    { url: `${baseUrl}/privacy`, lastModified: now },
    { url: `${baseUrl}/terms`, lastModified: now },
    { url: `${baseUrl}/refund-policy`, lastModified: now },
    { url: `${baseUrl}/login`, lastModified: now },
    { url: `${baseUrl}/signup`, lastModified: now },
  ];

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
        });
      }
    }
  } catch (e) {
    console.warn('[sitemap] packages fetch threw:', e instanceof Error ? e.message : String(e));
  }

  console.log(`[sitemap] total dynamic routes: ${dynamicRoutes.length}`);
  return [...staticRoutes, ...dynamicRoutes];
}
