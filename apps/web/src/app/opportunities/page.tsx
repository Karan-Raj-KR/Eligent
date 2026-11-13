import { OpportunitiesBrowser } from "@/components/opportunities-browser";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("opportunities", "/opportunities");

export default function OpportunitiesPage() {
  return <OpportunitiesBrowser />;
}
