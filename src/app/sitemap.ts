import { MetadataRoute } from 'next';
import { supabase } from '@/utils/supabaseClient';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hajjscanner.com';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/packages`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
    { url: `${baseUrl}/login`, lastModified: new Date() },
    { url: `${baseUrl}/signup`, lastModified: new Date() },
  ];

  // Fetch all packages and agents from Supabase
  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Packages
    // const { data: packages, error: packagesError } = await supabase.from('packages').select('*');
    // if (!packagesError && packages) {
    //   dynamicRoutes = packages.map((pkg) => ({
    //     url: `${baseUrl}/${pkg.agent_name}/${pkg.slug}`,
    //     lastModified: pkg.updated_at ? new Date(pkg.updated_at) : new Date(),
    //   }));
    // }

    // Agents for /domain/agentName and /agentName
    const { data: agents, error: agentsError } = await supabase.from('agents').select('*');
    if (!agentsError && agents) {
      const agentRoutes = agents.flatMap((agent) => [
        {
          url: `${baseUrl}/${agent.slug}`,
          lastModified: agent.updated_at ? new Date(agent.updated_at) : new Date(),
        },
      ]);
      dynamicRoutes = [...dynamicRoutes, ...agentRoutes];
    }
  } catch (error) {
    console.error('Error fetching data for sitemap:', error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
