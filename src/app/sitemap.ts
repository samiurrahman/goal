import { MetadataRoute } from "next";
import supabase from "@/utils/supabaseClient";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hajjscanner.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/packages`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
    },
  ];

  // Fetch all packages from Supabase
  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: packages, error } = await supabase
      .from("packages")
      .select("*");

    if (!error && packages) {
      dynamicRoutes = packages.map((pkg) => ({
        url: `${baseUrl}/${pkg.agent_name}/${pkg.slug}`,
        lastModified: pkg.updated_at ? new Date(pkg.updated_at) : new Date(),
      }));
    }
  } catch (error) {
    console.error("Error fetching packages for sitemap:", error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
