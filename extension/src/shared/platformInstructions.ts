/**
 * Platform detection + paste-into-your-CMS instructions.
 *
 * When auto-commit isn't available (Wix, Squarespace, Webflow, etc.) we show the user
 * a step-by-step guide for where to paste the generated content into their CMS.
 * Without these instructions, "auto-commit not available" basically means "good luck."
 */

export type CmsPlatform =
  | "wix"
  | "squarespace"
  | "webflow"
  | "shopify"
  | "wordpress"
  | "ghost"
  | "framer"
  | "nextjs"
  | "static"
  | "unknown";

export type FixKind = "meta_desc" | "title_tag" | "schema_org" | "alt_text" | "faq_page";

export interface PlatformInstructions {
  platformName: string;
  steps: string[];
  note?: string;
}

export function detectPlatform(): CmsPlatform {
  // 1. Check meta generator tag — most CMSs declare themselves
  const generator = (document.querySelector('meta[name="generator"]') as HTMLMetaElement | null)?.content?.toLowerCase() ?? "";
  if (generator.includes("wix")) return "wix";
  if (generator.includes("squarespace")) return "squarespace";
  if (generator.includes("webflow")) return "webflow";
  if (generator.includes("ghost")) return "ghost";
  if (generator.includes("framer")) return "framer";
  if (generator.includes("wordpress")) return "wordpress";
  if (generator.includes("shopify")) return "shopify";

  // 2. Check script srcs and other body markers
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"));
  for (const s of scripts) {
    const src = s.src.toLowerCase();
    if (src.includes("static.parastorage.com") || src.includes("wix.com/")) return "wix";
    if (src.includes("squarespace.com/") || src.includes("squarespace-cdn")) return "squarespace";
    if (src.includes("webflow.com")) return "webflow";
    if (src.includes("shopify.com") || src.includes("shopifycdn.com")) return "shopify";
    if (src.includes("/wp-content/") || src.includes("/wp-includes/")) return "wordpress";
    if (src.includes("ghost.io") || src.includes("ghost.org")) return "ghost";
    if (src.includes("framerusercontent.com") || src.includes("framer.com")) return "framer";
    if (src.includes("/_next/")) return "nextjs";
  }

  // 3. Check HTML markers
  const html = document.documentElement;
  const bodyClasses = document.body?.className ?? "";
  if (bodyClasses.includes("wp-") || document.querySelector('link[href*="/wp-"]')) return "wordpress";
  if (html.getAttribute("data-wix-app") || document.querySelector("[id^='wix']")) return "wix";
  if (document.querySelector('link[href*="static1.squarespace"]')) return "squarespace";
  if (html.getAttribute("data-wf-page") || html.getAttribute("data-wf-site")) return "webflow";
  if (document.querySelector('link[href*="cdn.shopify.com"]')) return "shopify";

  // 4. Static / unknown — has HTML but no obvious CMS markers
  if (document.title || document.querySelector("h1")) return "static";

  return "unknown";
}

const PLATFORM_DISPLAY_NAMES: Record<CmsPlatform, string> = {
  wix: "Wix",
  squarespace: "Squarespace",
  webflow: "Webflow",
  shopify: "Shopify",
  wordpress: "WordPress",
  ghost: "Ghost",
  framer: "Framer",
  nextjs: "Next.js",
  static: "your site",
  unknown: "your site",
};

const META_DESC_INSTRUCTIONS: Record<CmsPlatform, PlatformInstructions> = {
  wix: {
    platformName: "Wix",
    steps: [
      "Open your Wix Editor",
      "Click the page you want to update in the page list",
      "Click the page settings icon (gear icon next to the page name)",
      "Click the \"SEO\" tab",
      "Paste the new version into the \"Description\" field",
      "Click \"Save\" at the top, then \"Publish\"",
    ],
  },
  squarespace: {
    platformName: "Squarespace",
    steps: [
      "Open your Squarespace dashboard",
      "Click the page you want to update in \"Pages\"",
      "Click the gear icon next to the page name",
      "Scroll to \"SEO Settings\"",
      "Paste into \"SEO Description\"",
      "Click \"Save\"",
    ],
  },
  webflow: {
    platformName: "Webflow",
    steps: [
      "Open your site in Webflow Designer",
      "Click the page in the left sidebar",
      "Click the page settings icon (gear icon)",
      "Scroll to \"SEO Settings\"",
      "Paste into \"Meta Description\"",
      "Click \"Save\" → \"Publish\"",
    ],
  },
  shopify: {
    platformName: "Shopify",
    steps: [
      "Open your Shopify admin",
      "Go to \"Online Store\" → \"Pages\" (or your homepage under \"Themes\" → \"Customize\")",
      "Click the page you want to update",
      "Scroll to \"Search engine listing preview\" → click \"Edit website SEO\"",
      "Paste into \"Meta description\"",
      "Click \"Save\"",
    ],
  },
  wordpress: {
    platformName: "WordPress",
    steps: [
      "Open the WordPress admin (yoursite.com/wp-admin)",
      "Edit the page you want to update",
      "Scroll to your SEO plugin's panel: Yoast, RankMath, or All-in-One SEO",
      "Paste into \"Meta description\"",
      "Click \"Update\"",
    ],
    note: "If you don't see an SEO panel, install Yoast SEO (free) — search \"Yoast\" in Plugins → Add New.",
  },
  ghost: {
    platformName: "Ghost",
    steps: [
      "Open your Ghost admin",
      "Edit the page or post",
      "Click the settings gear in the top right",
      "Expand the \"Meta data\" section",
      "Paste into \"Meta description\"",
      "Click \"Update\"",
    ],
  },
  framer: {
    platformName: "Framer",
    steps: [
      "Open your Framer project",
      "Click the page in the left sidebar",
      "Open page settings (right sidebar)",
      "Find the \"SEO\" section",
      "Paste into \"Description\"",
      "Click \"Publish\"",
    ],
  },
  nextjs: {
    platformName: "Next.js",
    steps: [
      "Open your Next.js project in your code editor",
      "Find your root layout file (usually src/app/layout.tsx or app/layout.tsx)",
      "Find the metadata export — it looks like: export const metadata = { ... }",
      "Replace the description field with the new version",
      "Commit and push (Surven can auto-commit this for you when GitHub is connected — check Settings → Integrations)",
    ],
  },
  static: {
    platformName: "your site",
    steps: [
      "Open your site's HTML file (usually index.html)",
      "Find the line that looks like <meta name=\"description\" content=\"...\">",
      "Replace the content attribute with the new version",
      "If there's no description tag yet, add one inside the <head> section",
      "Save and re-deploy",
    ],
  },
  unknown: {
    platformName: "your site",
    steps: [
      "Look for a \"Meta description\" or \"Page description\" field in your site's page or SEO settings",
      "Paste the new version into that field",
      "Save your changes",
    ],
    note: "If you can't find it, Google your CMS name + \"add meta description\" for help.",
  },
};

const TITLE_INSTRUCTIONS: Record<CmsPlatform, PlatformInstructions> = {
  wix: {
    platformName: "Wix",
    steps: [
      "Open your Wix Editor",
      "Click the page you want to update",
      "Click the page settings gear",
      "Click the \"SEO\" tab",
      "Paste into \"Page Title\"",
      "Click Save → Publish",
    ],
  },
  squarespace: {
    platformName: "Squarespace",
    steps: [
      "Open your Squarespace dashboard",
      "Pages → click the page → gear icon",
      "Scroll to \"SEO Settings\"",
      "Paste into \"SEO Title\"",
      "Click Save",
    ],
  },
  webflow: {
    platformName: "Webflow",
    steps: [
      "Open your site in Webflow Designer",
      "Click the page → gear icon",
      "Scroll to \"SEO Settings\"",
      "Paste into \"Title Tag\"",
      "Click Save → Publish",
    ],
  },
  shopify: {
    platformName: "Shopify",
    steps: [
      "Online Store → Pages → click the page",
      "Scroll to \"Search engine listing preview\" → \"Edit website SEO\"",
      "Paste into \"Page title\"",
      "Click Save",
    ],
  },
  wordpress: {
    platformName: "WordPress",
    steps: [
      "Edit the page in WordPress admin",
      "Find your SEO plugin's panel (Yoast / RankMath / AIOSEO)",
      "Paste into \"SEO title\" or \"Title\"",
      "Click Update",
    ],
    note: "If no SEO plugin, install Yoast SEO (free).",
  },
  ghost: {
    platformName: "Ghost",
    steps: [
      "Edit the page or post in Ghost admin",
      "Click the gear icon → \"Meta data\"",
      "Paste into \"Meta title\"",
      "Click Update",
    ],
  },
  framer: {
    platformName: "Framer",
    steps: [
      "Open your Framer project",
      "Click the page → page settings (right sidebar)",
      "Find \"SEO\" section",
      "Paste into \"Title\"",
      "Click Publish",
    ],
  },
  nextjs: {
    platformName: "Next.js",
    steps: [
      "Open your Next.js project",
      "Find src/app/layout.tsx (or app/layout.tsx)",
      "Find the metadata export's title field",
      "Replace it with the new version",
      "Commit and push",
    ],
  },
  static: {
    platformName: "your site",
    steps: [
      "Open your site's HTML file (usually index.html)",
      "Find the <title>...</title> line in the <head> section",
      "Replace the text inside with the new version",
      "Save and re-deploy",
    ],
  },
  unknown: {
    platformName: "your site",
    steps: [
      "Look for a \"Page title\" or \"SEO title\" field in your site's page settings",
      "Paste the new version into that field",
      "Save your changes",
    ],
  },
};

const SCHEMA_INSTRUCTIONS: Record<CmsPlatform, PlatformInstructions> = {
  wix: {
    platformName: "Wix",
    steps: [
      "Open your Wix Editor",
      "Click \"Settings\" in the left menu",
      "Click \"Custom Code\"",
      "Click \"+ Add Custom Code\"",
      "Paste the snippet into the code box",
      "Set \"Add Code to Pages\" to \"All pages\"",
      "Set \"Place Code in\" to \"Head\"",
      "Click \"Apply\"",
    ],
    note: "Wix Custom Code requires a paid Premium plan.",
  },
  squarespace: {
    platformName: "Squarespace",
    steps: [
      "Open your Squarespace dashboard",
      "Settings → Advanced → Code Injection",
      "Paste the snippet into the \"Header\" box",
      "Click Save",
    ],
    note: "Code Injection requires a Business plan or higher.",
  },
  webflow: {
    platformName: "Webflow",
    steps: [
      "Open your site in Webflow Designer",
      "Project Settings → \"Custom Code\" tab",
      "Paste the snippet into \"Head Code\"",
      "Click Save Changes → Publish",
    ],
  },
  shopify: {
    platformName: "Shopify",
    steps: [
      "Online Store → Themes → click \"Edit code\" on your active theme",
      "Open the file \"layout/theme.liquid\"",
      "Find the </head> tag",
      "Paste the snippet on the line BEFORE </head>",
      "Click Save",
    ],
  },
  wordpress: {
    platformName: "WordPress",
    steps: [
      "Open WordPress admin",
      "Install \"Insert Headers and Footers\" plugin (free) if you don't have one",
      "Plugin settings → paste snippet into \"Scripts in Header\"",
      "Click Save",
    ],
    note: "Alternatively: Yoast / RankMath have schema sections per page that handle this automatically.",
  },
  ghost: {
    platformName: "Ghost",
    steps: [
      "Open Ghost admin",
      "Settings → Code Injection",
      "Paste the snippet into \"Site Header\"",
      "Click Save",
    ],
  },
  framer: {
    platformName: "Framer",
    steps: [
      "Open your Framer project",
      "Site Settings → \"General\"",
      "Find \"Custom Code\" section",
      "Paste the snippet into \"Start of <head> tag\"",
      "Click Publish",
    ],
  },
  nextjs: {
    platformName: "Next.js",
    steps: [
      "Open your Next.js project",
      "Open src/app/layout.tsx",
      "Inside the <body> tag, before {children}, add the snippet as a <script type=\"application/ld+json\"> JSX element",
      "Use dangerouslySetInnerHTML={{ __html: JSON.stringify({...}) }}",
      "Commit and push",
    ],
    note: "Surven can auto-commit this for you when your repo is connected — check Settings → Integrations.",
  },
  static: {
    platformName: "your site",
    steps: [
      "Open your site's HTML file (usually index.html)",
      "Find the </head> tag",
      "Paste the snippet on the line BEFORE </head>",
      "Save and re-deploy",
    ],
  },
  unknown: {
    platformName: "your site",
    steps: [
      "You need to add this <script> tag to your site's HTML <head>",
      "Look for a \"Custom code\" or \"Header code\" or \"Code injection\" feature in your site builder",
      "Paste the full snippet there",
      "Save your changes",
    ],
  },
};

const ALT_TEXT_INSTRUCTIONS: Record<CmsPlatform, PlatformInstructions> = {
  wix: {
    platformName: "Wix",
    steps: [
      "Click the image in your Wix Editor",
      "Click \"Settings\" (gear icon)",
      "Find the \"What's in the image?\" field (or \"Alt Text\")",
      "Paste the alt text",
      "Click Save → Publish",
    ],
  },
  squarespace: {
    platformName: "Squarespace",
    steps: [
      "Click the image block in Squarespace",
      "Click the pencil/edit icon",
      "Paste the alt text into the \"Description\" or \"Alt text\" field",
      "Click Save",
    ],
  },
  webflow: {
    platformName: "Webflow",
    steps: [
      "Click the image element in Webflow Designer",
      "In the right sidebar, find \"Alt Text\"",
      "Paste the alt text",
      "Click Publish",
    ],
  },
  shopify: {
    platformName: "Shopify",
    steps: [
      "Open the product / page / blog post containing the image",
      "Click the image",
      "Click \"Edit alt text\"",
      "Paste the alt text",
      "Click Save",
    ],
  },
  wordpress: {
    platformName: "WordPress",
    steps: [
      "Edit the page / post containing the image",
      "Click the image to select it",
      "In the right sidebar, find \"Alt text\"",
      "Paste the alt text",
      "Click Update",
    ],
  },
  ghost: { platformName: "Ghost", steps: ["Click the image in Ghost editor", "Click the settings (gear icon)", "Paste into \"Alt text\"", "Click Update"] },
  framer: { platformName: "Framer", steps: ["Click the image in Framer", "Right sidebar → \"Alt Text\"", "Paste the alt text", "Publish"] },
  nextjs: {
    platformName: "Next.js",
    steps: [
      "Find the <Image> or <img> in your code",
      "Add or update the alt prop with the new text",
      "Commit and push",
    ],
  },
  static: { platformName: "your site", steps: ["Find the <img> tag in your HTML", "Add or replace the alt=\"\" attribute with the new text", "Save and re-deploy"] },
  unknown: { platformName: "your site", steps: ["Look for an \"Alt text\" or \"Image description\" field next to the image in your editor", "Paste the alt text there", "Save"] },
};

export function getInstructionsForPlatform(platform: CmsPlatform, kind: FixKind): PlatformInstructions {
  switch (kind) {
    case "meta_desc":
      return META_DESC_INSTRUCTIONS[platform];
    case "title_tag":
      return TITLE_INSTRUCTIONS[platform];
    case "schema_org":
    case "faq_page":
      return SCHEMA_INSTRUCTIONS[platform];
    case "alt_text":
      return ALT_TEXT_INSTRUCTIONS[platform];
  }
}

export function getDisplayName(platform: CmsPlatform): string {
  return PLATFORM_DISPLAY_NAMES[platform];
}
