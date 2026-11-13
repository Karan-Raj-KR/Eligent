import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PATHS = ["/", "/opportunities", "/signin", "/extension", "/privacy", "/terms", "/refund"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-13");
  return PATHS.map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
  }));
}
