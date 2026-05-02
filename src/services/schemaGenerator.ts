/**
 * Deterministic JSON-LD schema generation.
 *
 * Takes raw page data (extracted client-side by the Chrome extension)
 * and templates it into valid Schema.org JSON-LD. No LLM required.
 *
 * Used by /api/audit/generate for Sprint 1.
 */

export type SchemaKind =
  | "Organization"
  | "LocalBusiness"
  | "WebSite"
  | "BreadcrumbList"
  | "FAQPage"
  | "Article"
  | "Review"
  | "Product"
  | "Service"
  | "VideoObject"
  | "Event"
  | "Recipe"
  | "Person";

export interface PageContext {
  url: string;
  title?: string;
  description?: string;
  businessName?: string;
  bodyContent?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  hours?: Array<{ days: string; opens: string; closes: string }>;
  socials?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  reviewItems?: Array<{ author?: string; rating?: number; text?: string }>;
  productItems?: Array<{ name: string; price?: string; image?: string; description?: string }>;
  serviceItems?: Array<{ name: string; description?: string }>;
  videoItems?: Array<{ name?: string; description?: string; thumbnailUrl?: string; embedUrl?: string }>;
  personItems?: Array<{ name: string; jobTitle?: string; image?: string; bio?: string }>;
  breadcrumbItems?: Array<{ name: string; url: string }>;
  articleHeadline?: string;
  articleAuthor?: string;
  articleDate?: string;
  logo?: string;
}

interface SchemaBuildResult {
  ok: boolean;
  jsonLd?: string;
  error?: string;
}

export function generateSchema(kind: SchemaKind, ctx: PageContext): SchemaBuildResult {
  try {
    const origin = (() => {
      try {
        return new URL(ctx.url).origin;
      } catch {
        return ctx.url;
      }
    })();

    let obj: Record<string, unknown> | null = null;

    switch (kind) {
      case "Organization":
        obj = buildOrganization(origin, ctx);
        break;
      case "LocalBusiness":
        obj = buildLocalBusiness(origin, ctx);
        break;
      case "WebSite":
        obj = buildWebSite(origin, ctx);
        break;
      case "BreadcrumbList":
        obj = buildBreadcrumbList(ctx);
        break;
      case "FAQPage":
        obj = buildFaqPage(ctx);
        break;
      case "Article":
        obj = buildArticle(origin, ctx);
        break;
      case "Review":
        obj = buildReview(ctx);
        break;
      case "Product":
        obj = buildProduct(ctx);
        break;
      case "Service":
        obj = buildService(origin, ctx);
        break;
      case "VideoObject":
        obj = buildVideoObject(ctx);
        break;
      case "Event":
        obj = buildEvent(ctx);
        break;
      case "Recipe":
        obj = buildRecipe(ctx);
        break;
      case "Person":
        obj = buildPerson(ctx);
        break;
    }

    if (!obj) {
      return { ok: false, error: `Not enough data on the page to build ${kind} schema` };
    }

    const jsonLd = `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
    return { ok: true, jsonLd };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function buildOrganization(origin: string, ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.businessName) return null;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ctx.businessName,
    url: origin,
  };
  if (ctx.logo) obj.logo = ctx.logo;
  if (ctx.description) obj.description = ctx.description;
  if (ctx.socials && ctx.socials.length > 0) obj.sameAs = ctx.socials;
  if (ctx.phone) obj.telephone = ctx.phone;
  return obj;
}

function buildLocalBusiness(origin: string, ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.businessName) return null;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: ctx.businessName,
    url: origin,
  };
  if (ctx.logo) obj.image = ctx.logo;
  if (ctx.description) obj.description = ctx.description;
  if (ctx.phone) obj.telephone = ctx.phone;
  if (ctx.address && ctx.address.street) {
    obj.address = {
      "@type": "PostalAddress",
      streetAddress: ctx.address.street,
      ...(ctx.address.city ? { addressLocality: ctx.address.city } : {}),
      ...(ctx.address.region ? { addressRegion: ctx.address.region } : {}),
      ...(ctx.address.postalCode ? { postalCode: ctx.address.postalCode } : {}),
      ...(ctx.address.country ? { addressCountry: ctx.address.country } : { addressCountry: "US" }),
    };
  }
  if (ctx.hours && ctx.hours.length > 0) {
    obj.openingHoursSpecification = ctx.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.split(/[,/]/).map((d) => d.trim()),
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (ctx.socials && ctx.socials.length > 0) obj.sameAs = ctx.socials;
  return obj;
}

function buildWebSite(origin: string, ctx: PageContext): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ctx.businessName ?? ctx.title ?? "Site",
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${origin}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBreadcrumbList(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.breadcrumbItems || ctx.breadcrumbItems.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: ctx.breadcrumbItems.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildFaqPage(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.faqItems || ctx.faqItems.length < 1) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ctx.faqItems.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

function buildArticle(origin: string, ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.articleHeadline && !ctx.title) return null;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ctx.articleHeadline ?? ctx.title,
    url: ctx.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": ctx.url },
  };
  if (ctx.description) obj.description = ctx.description;
  if (ctx.articleAuthor) obj.author = { "@type": "Person", name: ctx.articleAuthor };
  if (ctx.articleDate) obj.datePublished = ctx.articleDate;
  if (ctx.businessName) obj.publisher = { "@type": "Organization", name: ctx.businessName, ...(ctx.logo ? { logo: { "@type": "ImageObject", url: ctx.logo } } : {}) };
  void origin;
  return obj;
}

function buildReview(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.reviewItems || ctx.reviewItems.length === 0) return null;
  if (ctx.reviewItems.length === 1) {
    const r = ctx.reviewItems[0];
    return {
      "@context": "https://schema.org",
      "@type": "Review",
      ...(r.author ? { author: { "@type": "Person", name: r.author } } : {}),
      ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } } : {}),
      ...(r.text ? { reviewBody: r.text } : {}),
      ...(ctx.businessName ? { itemReviewed: { "@type": "LocalBusiness", name: ctx.businessName } } : {}),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ctx.reviewItems.map((r, idx) => ({
      "@type": "Review",
      position: idx + 1,
      ...(r.author ? { author: { "@type": "Person", name: r.author } } : {}),
      ...(r.rating ? { reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 } } : {}),
      ...(r.text ? { reviewBody: r.text } : {}),
    })),
  };
}

function buildProduct(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.productItems || ctx.productItems.length === 0) return null;
  if (ctx.productItems.length === 1) {
    const p = ctx.productItems[0];
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      ...(p.image ? { image: p.image } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.price
        ? {
            offers: {
              "@type": "Offer",
              price: p.price.replace(/[^0-9.]/g, ""),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ctx.productItems.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: p.name,
        ...(p.image ? { image: p.image } : {}),
        ...(p.price ? { offers: { "@type": "Offer", price: p.price.replace(/[^0-9.]/g, ""), priceCurrency: "USD" } } : {}),
      },
    })),
  };
}

function buildService(origin: string, ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.serviceItems || ctx.serviceItems.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ctx.serviceItems.map((s, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Service",
        name: s.name,
        ...(s.description ? { description: s.description } : {}),
        ...(ctx.businessName ? { provider: { "@type": "Organization", name: ctx.businessName, url: origin } } : {}),
      },
    })),
  };
}

function buildVideoObject(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.videoItems || ctx.videoItems.length === 0) return null;
  if (ctx.videoItems.length === 1) {
    const v = ctx.videoItems[0];
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: v.name ?? "Video",
      ...(v.description ? { description: v.description } : {}),
      ...(v.thumbnailUrl ? { thumbnailUrl: v.thumbnailUrl } : {}),
      ...(v.embedUrl ? { embedUrl: v.embedUrl } : {}),
      uploadDate: new Date().toISOString(),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ctx.videoItems.map((v, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "VideoObject",
        name: v.name ?? `Video ${idx + 1}`,
        ...(v.description ? { description: v.description } : {}),
        ...(v.thumbnailUrl ? { thumbnailUrl: v.thumbnailUrl } : {}),
        ...(v.embedUrl ? { embedUrl: v.embedUrl } : {}),
      },
    })),
  };
}

function buildEvent(ctx: PageContext): Record<string, unknown> | null {
  void ctx;
  return null;
}

function buildRecipe(ctx: PageContext): Record<string, unknown> | null {
  void ctx;
  return null;
}

function buildPerson(ctx: PageContext): Record<string, unknown> | null {
  if (!ctx.personItems || ctx.personItems.length === 0) return null;
  if (ctx.personItems.length === 1) {
    const p = ctx.personItems[0];
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      name: p.name,
      ...(p.jobTitle ? { jobTitle: p.jobTitle } : {}),
      ...(p.image ? { image: p.image } : {}),
      ...(p.bio ? { description: p.bio } : {}),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ctx.personItems.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Person",
        name: p.name,
        ...(p.jobTitle ? { jobTitle: p.jobTitle } : {}),
        ...(p.image ? { image: p.image } : {}),
      },
    })),
  };
}
