import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabaseClient';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/packages`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/terms`, lastModified: new Date() },
    { url: `${baseUrl}/refund-policy`, lastModified: new Date() },
    { url: `${baseUrl}/login`, lastModified: new Date() },
    { url: `${baseUrl}/signup`, lastModified: new Date() },
  ];

  // Fetch all packages and agents from Supabase
  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Agents for /agentName
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('slug, auth_user_id, created_at');

    if (!agentsError && agents) {
      const agentRoutes = agents
        .filter((agent) => agent.slug)
        .map((agent) => ({
          url: `${baseUrl}/${agent.slug}`,
          lastModified: new Date(agent.created_at || Date.now()),
        }));
      dynamicRoutes = [...dynamicRoutes, ...agentRoutes];

      // Build agent_id (auth_user_id) → slug map for package URLs
      const agentSlugByAuthId = new Map<string, string>();
      for (const agent of agents) {
        if (agent.auth_user_id && agent.slug) {
          agentSlugByAuthId.set(agent.auth_user_id, agent.slug);
        }
      }

      // Packages for /agentName/slug — only published packages with a slug,
      // and only those whose agent has a resolvable slug.
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('slug, agent_id, created_at, published');

      if (!packagesError && packages) {
        const packageRoutes = packages
          .filter(
            (pkg) =>
              pkg.published !== false && pkg.slug && pkg.agent_id && agentSlugByAuthId.has(pkg.agent_id)
          )
          .map((pkg) => ({
            url: `${baseUrl}/${agentSlugByAuthId.get(pkg.agent_id as string)}/${pkg.slug}`,
            lastModified: new Date(pkg.created_at || Date.now()),
          }));
        dynamicRoutes = [...dynamicRoutes, ...packageRoutes];
      }
    }
  } catch (error) {
    console.warn(
      'Warning: Could not fetch dynamic routes for sitemap:',
      error instanceof Error ? error.message : String(error)
    );
    // Sitemap will continue with static routes only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
