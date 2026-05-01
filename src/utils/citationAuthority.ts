export type AuthorityTier = "high" | "medium" | "low";
export type SourceCategory =
  | "directory"
  | "social"
  | "news"
  | "wiki"
  | "industry"
  | "your_site"
  | "other";

const HIGH_AUTHORITY = new Set([
  "yelp.com",
  "google.com",
  "tripadvisor.com",
  "bbb.org",
  "wikipedia.org",
  "nytimes.com",
  "forbes.com",
  "wsj.com",
  "bloomberg.com",
  "reuters.com",
  "houzz.com",
  "angi.com",
  "homeadvisor.com",
  "thumbtack.com",
  "yellowpages.com",
  "mapquest.com",
  "foursquare.com",
  "linkedin.com",
  "businesswire.com",
  "prnewswire.com",
]);

const MEDIUM_AUTHORITY = new Set([
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "nextdoor.com",
  "reddit.com",
  "medium.com",
  "quora.com",
  "expertise.com",
  "manta.com",
  "superpages.com",
  "citysearch.com",
  "merchantcircle.com",
  "kudzu.com",
  "ezlocal.com",
  "chamberofcommerce.com",
  "local.com",
]);

const SOCIAL_DOMAINS = new Set([
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "nextdoor.com",
  "reddit.com",
]);

const NEWS_DOMAINS = new Set([
  "nytimes.com",
  "wsj.com",
  "forbes.com",
  "bloomberg.com",
  "reuters.com",
  "businesswire.com",
  "prnewswire.com",
  "cnn.com",
  "bbc.com",
  "washingtonpost.com",
]);

const DIRECTORY_DOMAINS = new Set([
  "yelp.com",
  "google.com",
  "tripadvisor.com",
  "bbb.org",
  "houzz.com",
  "angi.com",
  "homeadvisor.com",
  "thumbtack.com",
  "yellowpages.com",
  "mapquest.com",
  "foursquare.com",
  "manta.com",
  "superpages.com",
  "citysearch.com",
  "merchantcircle.com",
  "kudzu.com",
  "ezlocal.com",
  "chamberofcommerce.com",
  "local.com",
  "expertise.com",
]);

const WIKI_DOMAINS = new Set(["wikipedia.org", "wikidata.org", "fandom.com"]);

export function getAuthority(domain: string): AuthorityTier {
  const d = domain.toLowerCase();
  if (HIGH_AUTHORITY.has(d)) return "high";
  if (MEDIUM_AUTHORITY.has(d)) return "medium";
  return "low";
}

export function getCategory(domain: string, ownDomain?: string | null): SourceCategory {
  const d = domain.toLowerCase();
  if (ownDomain && d === ownDomain.toLowerCase().replace(/^www\./, "")) return "your_site";
  if (DIRECTORY_DOMAINS.has(d)) return "directory";
  if (SOCIAL_DOMAINS.has(d)) return "social";
  if (NEWS_DOMAINS.has(d)) return "news";
  if (WIKI_DOMAINS.has(d)) return "wiki";
  return "other";
}

export const AUTHORITY_LABEL: Record<AuthorityTier, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const AUTHORITY_COLOR: Record<AuthorityTier, string> = {
  high: "#7D8E6C",
  medium: "#B8A030",
  low: "#A09890",
};

export const CATEGORY_LABEL: Record<SourceCategory, string> = {
  directory: "Directories",
  social: "Social",
  news: "News",
  wiki: "Wiki",
  industry: "Industry",
  your_site: "Your Site",
  other: "Other",
};

export const CATEGORY_COLOR: Record<SourceCategory, string> = {
  directory: "#96A283",
  social: "#6BA3F5",
  news: "#C97B45",
  wiki: "#B8A030",
  industry: "#A07878",
  your_site: "#7D8E6C",
  other: "#A09890",
};

export const KNOWN_DOMAINS_FOR_NAMED_EXTRACTION: { name: string; domain: string }[] = [
  { name: "Yelp", domain: "yelp.com" },
  { name: "Google Maps", domain: "google.com" },
  { name: "Google Business", domain: "google.com" },
  { name: "Google", domain: "google.com" },
  { name: "Tripadvisor", domain: "tripadvisor.com" },
  { name: "TripAdvisor", domain: "tripadvisor.com" },
  { name: "Better Business Bureau", domain: "bbb.org" },
  { name: "BBB", domain: "bbb.org" },
  { name: "Wikipedia", domain: "wikipedia.org" },
  { name: "Houzz", domain: "houzz.com" },
  { name: "Angi", domain: "angi.com" },
  { name: "Angie's List", domain: "angi.com" },
  { name: "HomeAdvisor", domain: "homeadvisor.com" },
  { name: "Thumbtack", domain: "thumbtack.com" },
  { name: "Yellow Pages", domain: "yellowpages.com" },
  { name: "YellowPages", domain: "yellowpages.com" },
  { name: "Foursquare", domain: "foursquare.com" },
  { name: "Facebook", domain: "facebook.com" },
  { name: "Instagram", domain: "instagram.com" },
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "Nextdoor", domain: "nextdoor.com" },
  { name: "Reddit", domain: "reddit.com" },
  { name: "Forbes", domain: "forbes.com" },
  { name: "New York Times", domain: "nytimes.com" },
  { name: "Wall Street Journal", domain: "wsj.com" },
  { name: "Bloomberg", domain: "bloomberg.com" },
  { name: "Manta", domain: "manta.com" },
  { name: "Expertise", domain: "expertise.com" },
];
