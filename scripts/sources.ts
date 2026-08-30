// One config object per source. Adding a source = adding an entry here; no new
// code in discover.ts or harvest.ts.
//
// - `listings`   : index/search pages discover.ts crawls for detail-page links
// - `detail`     : a resolved URL is a detail page for this source iff it matches
// - `crossHost`  : detail pages live on a different host than the listing
//                  (devpost hackathons each get their own *.devpost.com subdomain)
// - category / location_type / funded : stamped onto every opportunity harvested
//   from this source. These are the source's editorial classification, not data
//   read off any single page — a hackathon listing yields hackathons.
//
// robots.txt (checked 2026-08-30):
//   devpost.com      User-agent: *  Disallow:   (empty — all allowed)
//   unstop.com       Allow: /hackathons/ /internship/ /competitions/ ;
//                    only /api/*, /u/*, /p/* etc. disallowed — listing + detail OK
//   buddy4study.com  only /media-url/* and /UID/* disallowed

export type Category =
  | "scholarship"
  | "fellowship"
  | "grant"
  | "hackathon"
  | "internship"
  | "programme"
  | "event"
  | "competition";

export type LocationType = "india" | "abroad" | "online";

export interface Source {
  id: string;
  category: Category;
  location_type: LocationType;
  funded: boolean;
  listings: string[];
  detail: RegExp;
  /** Detail pages live on a different host than the listing (e.g. per-event
   * subdomains). Skips the same-host check; `detail` is then the only gate. */
  crossHost?: boolean;
}

export const SOURCES: Source[] = [
  {
    id: "buddy4study",
    category: "scholarship",
    location_type: "india",
    funded: true,
    listings: [
      "https://www.buddy4study.com/scholarships/engineering",
      "https://www.buddy4study.com/scholarships/karnataka",
    ],
    // detail pages: /scholarship/<slug> (singular). /scholarships/<x> and
    // /page/<x> are listing/brand chrome.
    detail: /^https?:\/\/www\.buddy4study\.com\/scholarship\/[^/]+\/?$/i,
  },
  // Devpost is handled by scripts/devpost.ts (its hackathon index is a JSON API,
  // https://devpost.com/api/hackathons — nothing to render or scrape). Kept out
  // of this scrape-oriented config on purpose.
  {
    id: "unstop-hackathons",
    category: "hackathon",
    location_type: "india",
    funded: false,
    listings: ["https://unstop.com/hackathons"],
    detail: /^https?:\/\/unstop\.com\/(hackathons|o)\/[^/]+/i,
  },
  {
    id: "unstop-internships",
    category: "internship",
    location_type: "india",
    funded: false,
    listings: ["https://unstop.com/internships"],
    detail: /^https?:\/\/unstop\.com\/(internships?|o)\/[^/]+/i,
  },
  {
    id: "unstop-competitions",
    category: "competition",
    location_type: "india",
    funded: false,
    listings: ["https://unstop.com/competitions"],
    detail: /^https?:\/\/unstop\.com\/(competitions?|o)\/[^/]+/i,
  },
];

/** The source whose listing set contains this URL, if any. */
export function sourceForListing(url: string): Source | undefined {
  return SOURCES.find((s) => s.listings.includes(url));
}

/** The source a harvested detail URL belongs to — decides its category /
 * location_type / funded. A URL matching nothing is a legacy indiascholarships.in
 * row: scholarship / india / true, per the broaden migration's defaults. */
export function classifyOpportunity(url: string): {
  category: Category;
  location_type: LocationType;
  funded: boolean;
} {
  const source = SOURCES.find((s) => s.detail.test(url));
  return {
    category: source?.category ?? "scholarship",
    location_type: source?.location_type ?? "india",
    funded: source?.funded ?? true,
  };
}
