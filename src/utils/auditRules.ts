import type { CrawledPage, AuditFinding, AuditSeverity } from "@/types/audit";

type RuleCheck = (homepage: CrawledPage, allPages: CrawledPage[]) => AuditFinding | null;

// LocalBusiness-compatible schema.org types
const LOCAL_BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "Plumber",
  "Dentist",
  "Lawyer",
  "Restaurant",
  "Salon",
  "Doctor",
  "MedicalBusiness",
  "HealthAndBeautyBusiness",
  "HomeAndConstructionBusiness",
  "FoodEstablishment",
  "LegalService",
  "Accountant",
  "AutoDealer",
  "AutomotiveBusiness",
  "Store",
  "RealEstateAgent",
  "Contractor",
  "HairSalon",
  "BeautySalon",
  "Optician",
  "Veterinary",
]);

function findingBase(
  id: string,
  title: string,
  severity: AuditSeverity,
  affectedPages: number,
  fixTime: number,
  impact: number,
  whyItMatters: string,
  howToFix: string
): AuditFinding {
  return { id, title, severity, affectedPages, estimatedFixTime: fixTime, estimatedImpact: impact, whyItMatters, howToFix };
}

const checkOrgSchema: RuleCheck = (homepage) => {
  if (homepage.schemaTypes.some((t) => t === "Organization" || t.includes("Organization"))) {
    return null;
  }
  return findingBase(
    "org_schema_missing",
    "Organization Schema Missing",
    "critical",
    1,
    30,
    8,
    "Organization schema tells AI systems exactly who your business is. Without it, ChatGPT, Gemini, and Google AI have to guess your business identity from visible text alone — which often leads to mistakes or omissions. Research shows 40% of AI responses include Organization information; pages with clear Organization schema are more likely to be cited with the correct business name, phone, and address.",
    "Add Organization schema to your homepage <head>. Minimum required fields: name, url, and contact (phone or email). Bonus fields: logo, areaServed, foundingDate.\n\nShould take 15–30 minutes."
  );
};

const checkLocalBizSchema: RuleCheck = (homepage) => {
  if (homepage.schemaTypes.some((t) => LOCAL_BUSINESS_TYPES.has(t))) return null;
  return findingBase(
    "local_business_schema_missing",
    "LocalBusiness Schema Missing",
    "critical",
    1,
    45,
    9,
    "When someone searches \"best dentist near me,\" AI systems use LocalBusiness schema to find matches in that area. Without it, they can't tell if you serve that location. Businesses with LocalBusiness schema + multi-platform citations (4+) are 2.8x more likely to appear in AI recommendations.",
    "Add LocalBusiness schema (or a service-specific type like Dentist, Plumber, Lawyer, etc.) to your homepage. Include your full address, phone number, business hours, and service areas.\n\nShould take 30–45 minutes."
  );
};

const checkFAQSchema: RuleCheck = (_homepage, allPages) => {
  for (const page of allPages) {
    if (!page.schemaTypes.includes("FAQPage")) continue;
    const faqSchema = page.schemas.find((s) => s["@type"] === "FAQPage");
    const entities = Array.isArray(faqSchema?.["mainEntity"])
      ? (faqSchema["mainEntity"] as unknown[])
      : [];
    if (entities.length >= 3) return null;
    // FAQPage exists but too few questions
    return findingBase(
      "faq_schema_insufficient",
      "FAQ Schema Has Too Few Questions",
      "high",
      1,
      30,
      8,
      "78% of AI-generated answers are in Q&A or list format. Your FAQPage schema was found but has fewer than 3 questions — most AI systems look for at least 5–10 solid Q&A pairs to treat a page as an authoritative FAQ source.",
      "Expand your FAQ section to 5–10 real customer questions with complete, self-contained answers (50–300 words each). Each answer should stand alone without requiring the user to \"see more.\"\n\nShould take 30 minutes to add more questions."
    );
  }
  return findingBase(
    "faq_schema_missing",
    "FAQ Schema Missing",
    "high",
    1,
    60,
    8,
    "78% of AI-generated answers are in Q&A or list format. FAQPage schema tells AI systems: \"Here are the questions customers actually ask, and here are the answers.\" Pages with FAQPage schema see 28–40% higher citation probability compared to pages with FAQ content but no schema.",
    "Add 5–10 real customer questions to your homepage (or a dedicated FAQ page). Wrap them in FAQPage schema using schema.org/FAQPage.\n\nExample questions for a dentist:\n- \"How much does a cleaning cost?\"\n- \"Do you take my insurance?\"\n- \"What should I do about tooth sensitivity?\"\n\nShould take 45 minutes to 1 hour."
  );
};

const checkContentFreshness: RuleCheck = (homepage) => {
  const now = Date.now();
  const days90 = 90 * 24 * 60 * 60 * 1000;
  const days180 = 180 * 24 * 60 * 60 * 1000;

  if (!homepage.lastModified) {
    const currentYear = new Date().getFullYear();
    const hasRecentYear =
      homepage.content.includes(String(currentYear)) ||
      homepage.content.includes(String(currentYear - 1));
    if (hasRecentYear) return null;
    return findingBase(
      "content_freshness_unknown",
      "Content Freshness Cannot Be Determined",
      "high",
      1,
      15,
      7,
      "AI models heavily favor recent content. Pages updated within 30 days get cited 3.2x more often than stale pages. Your homepage has no detectable Last-Modified date, making it impossible for AI systems to determine how current your content is.",
      "Add a Last-Modified HTTP header to your homepage, or add a <meta property=\"article:modified_time\"> tag with today's date. Also update at least one visible section of your homepage (new testimonial, updated hours, new team photo) to signal freshness.\n\nSet a calendar reminder to refresh your homepage every 4 weeks."
    );
  }

  const ageMs = now - homepage.lastModified.getTime();

  if (ageMs > days180) {
    return findingBase(
      "content_stale",
      "Homepage Content Is Over 6 Months Old",
      "high",
      1,
      15,
      7,
      "AI models heavily favor recent content. 76.4% of ChatGPT's most-cited pages were updated within 30 days. Content older than 6 months signals to AI systems that your business info may be outdated — old prices, old team, old services.",
      "Update at least one section of your homepage:\n- Add a recent client testimonial\n- Update pricing or service offerings\n- Add a new team photo\n- Write a brief \"What's new\" section\n- Update hours or contact info\n\nSet a calendar reminder to update your homepage every 4 weeks."
    );
  }

  if (ageMs > days90) {
    return findingBase(
      "content_outdated",
      "Homepage Content Is 90+ Days Old",
      "high",
      1,
      15,
      7,
      "Pages updated within 30 days get cited 3.2x more than stale pages. Your homepage hasn't been updated in over 90 days — AI systems may deprioritize it in favor of more recently updated sources.",
      "Make a small update to your homepage to reset the freshness signal:\n- Add a new testimonial or review\n- Update a price or service\n- Write a brief news item or seasonal update\n\nSet a monthly calendar reminder to keep content fresh."
    );
  }

  return null;
};

const checkMetaDescription: RuleCheck = (homepage) => {
  const desc = homepage.metaDescription;
  if (!desc) {
    return findingBase(
      "meta_desc_missing",
      "Meta Description Missing",
      "medium",
      1,
      10,
      4,
      "Meta descriptions affect how your page appears in AI snippets. Without one, AI systems and search engines generate their own — which is often low quality and may not represent your business accurately.",
      "Write a 100–160 character meta description for your homepage. Include:\n- Your business name + main service\n- Your location\n- A benefit or call to action\n\nExample: \"Trusted Austin dentist since 1995. Family & cosmetic dentistry. New patients welcome. Call (512) 555-1234.\"\n\nShould take 5–10 minutes."
    );
  }
  if (desc.length < 100) {
    return findingBase(
      "meta_desc_short",
      "Meta Description Too Short",
      "medium",
      1,
      10,
      4,
      "Your meta description is only " + desc.length + " characters. AI systems use the meta description to understand your page — short descriptions miss the opportunity to communicate your service, location, and unique value.",
      "Expand your meta description to 100–160 characters. Include your business name, service type, location, and a unique angle or call to action.\n\nShould take 5–10 minutes."
    );
  }
  if (desc.length > 160) {
    return findingBase(
      "meta_desc_long",
      "Meta Description Too Long",
      "medium",
      1,
      5,
      4,
      "Your meta description is " + desc.length + " characters — over the 160-character limit. Search engines and AI systems truncate it, cutting off potentially important information.",
      "Trim your meta description to under 160 characters. Keep the most important info: business name, service, location, and one benefit.\n\nShould take 5 minutes."
    );
  }
  return null;
};

const checkCredentials: RuleCheck = (homepage) => {
  const c = homepage.content.toLowerCase();
  let score = 0;

  if (/licens|certif|accredit/.test(c)) score++;
  if (/since\s+1[89]\d\d|since\s+20\d\d|years?\s+(?:of\s+)?experience|years?\s+in\s+business|founded\s+in/.test(c)) score++;
  if (/award|best\s+of|top\s+rated|ranked\s+#/.test(c)) score++;
  if (/reviews|star\s+rating|rated\s+\d|yelp|google\s+review/.test(c)) score++;
  if (/featured\s+in|as\s+seen\s+in|press\s+mention|media/.test(c)) score++;

  if (score === 0) {
    return findingBase(
      "credentials_missing",
      "No Credentials or Authority Signals Found",
      "medium",
      1,
      60,
      6,
      "96% of AI Overview content comes from sources with verified E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness). Your homepage has no visible credentials — AI systems see it as less trustworthy compared to competitors who display them.",
      "Add visible credibility signals to your homepage. Choose from:\n1. Years in business: \"Serving Austin since 1995\" or \"20+ years experience\"\n2. Licenses/certifications: Display your professional licenses\n3. Reviews: Show Google or Yelp star ratings\n4. Awards: Display \"Best of\" badges or industry recognition\n5. Team bios: Link to staff credentials\n6. \"Featured in\" badges: Media mentions or industry publications\n\nPick 3–5 that apply. Should take 30 minutes to 2 hours."
    );
  }

  if (score <= 2) {
    return findingBase(
      "credentials_low",
      "Few Credentials and Authority Signals",
      "medium",
      1,
      45,
      6,
      "96% of AI Overview content comes from sources with verified E-E-A-T signals. Your homepage has " + score + " of 5 possible credential categories — adding more will increase AI trust and citation likelihood.",
      "Strengthen your homepage credibility by adding more of these signals:\n1. Years in business: \"Serving Austin since 1995\"\n2. Licenses/certifications\n3. Reviews (Google, Yelp star ratings)\n4. Awards and recognition\n5. \"Featured in\" media badges\n\nAim for 3–5 signals. Should take 30–60 minutes."
    );
  }

  return null;
};

const checkCitationConsistency: RuleCheck = () => {
  return findingBase(
    "citation_consistency",
    "Citation Consistency Audit Required",
    "critical",
    0,
    90,
    8,
    "AI systems trust information more when it appears consistently across multiple sources. Inconsistencies between your website, Google Business Profile, Yelp, and BBB — even minor ones like \"Main St\" vs \"Main Street\" — actively undermine AI trust. Businesses with consistent info across 4+ platforms are 2.8x more likely to appear in AI responses.",
    "Manually audit your presence across these platforms and ensure this info is identical everywhere:\n1. Your website\n2. Google Business Profile (google.com/business)\n3. Yelp (yelp.com/biz)\n4. BBB (bbb.org)\n5. Industry directory (Zocdoc, Avvo, HomeAdvisor, etc.)\n\nCheck: business name (exact spelling), full address, phone number, hours, website URL.\n\nUpdate any that differ. Should take 30 minutes to 2 hours."
  );
};

const checkTitleTag: RuleCheck = (homepage) => {
  const title = homepage.title;
  const genericTitles = ["home", "welcome", "index", "homepage", "untitled", "new page"];

  if (!title) {
    return findingBase(
      "title_tag_missing",
      "Title Tag Missing",
      "medium",
      1,
      5,
      3,
      "The title tag is the first thing AI systems and search engines see. Without one, your page appears unnamed and unindexed — AI systems have no signal about what your page covers.",
      "Add a <title> tag to your homepage's <head> section. Use this format: \"[Service] in [City] | [Business Name]\".\n\nExample: \"Austin Dentist | Family & Cosmetic Dental Care | Dr. Smith\"\n\nShould take 5 minutes."
    );
  }

  if (genericTitles.includes(title.toLowerCase().trim())) {
    return findingBase(
      "title_tag_generic",
      "Title Tag Is Generic",
      "medium",
      1,
      5,
      3,
      "Your title tag says \"" + title + "\" — AI systems have no idea what your business does or where you're located. Generic titles like \"Home\" or \"Welcome\" miss the opportunity to communicate your service and location.",
      "Replace your generic title with a descriptive one (50–70 characters):\n- \"[Service] in [City] | [Business Name]\"\n- \"[Business Name] | [Service] in [City]\"\n\nExample: \"Austin Plumber | 24/7 Emergency Service | Acme Plumbing\"\n\nShould take 5 minutes."
    );
  }

  if (title.length < 30) {
    return findingBase(
      "title_tag_short",
      "Title Tag Too Short",
      "medium",
      1,
      5,
      3,
      "Your title tag is only " + title.length + " characters. Short titles don't give AI systems enough context about your business, service type, and location.",
      "Expand your title to 50–70 characters. Include your service type and city at minimum.\n\nExample: \"Austin Dentist | Family Dental Care | Dr. Smith DDS\"\n\nShould take 5 minutes."
    );
  }

  if (title.length > 70) {
    return findingBase(
      "title_tag_long",
      "Title Tag Too Long",
      "medium",
      1,
      5,
      3,
      "Your title tag is " + title.length + " characters — over the 70-character limit. Search engines and AI systems truncate it, potentially cutting off your business name or location.",
      "Trim your title to under 70 characters. Keep: primary service + city + business name.\n\nShould take 5 minutes."
    );
  }

  return null;
};

export const AUDIT_RULES: Array<{ id: string; check: RuleCheck }> = [
  { id: "local_business_schema", check: checkLocalBizSchema },
  { id: "org_schema", check: checkOrgSchema },
  { id: "faq_schema", check: checkFAQSchema },
  { id: "content_freshness", check: checkContentFreshness },
  { id: "citation_consistency", check: checkCitationConsistency },
  { id: "credentials", check: checkCredentials },
  { id: "meta_description", check: checkMetaDescription },
  { id: "title_tag", check: checkTitleTag },
];
