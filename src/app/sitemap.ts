import { MetadataRoute } from "next";
import { supabase } from "@/utils/supabaseClient";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hajjscanner.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/packages`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Fetch all packages from Supabase
  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: packages, error } = await supabase
      .from("packages")
      .select("slug, agent_name, agent_id, updated_at")
      .not("slug", "is", null)
      .not("agent_name", "is", null);

    if (!error && packages) {
      dynamicRoutes = packages.map((pkg) => ({
        url: `${baseUrl}/${pkg.agent_name}/${pkg.slug}`,
        lastModified: pkg.updated_at ? new Date(pkg.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Error fetching packages for sitemap:", error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
