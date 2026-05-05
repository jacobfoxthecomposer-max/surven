import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

export const metadata = {
  title: "Blog — Surven",
  description: "Guides, strategies, and insights on AI visibility and Generative Engine Optimization.",
};

const POSTS = [
  {
    slug: "#",
    category: "Strategy",
    title: "Why Your Business Isn't Showing Up on ChatGPT (And How to Fix It)",
    excerpt: "Most businesses assume they have an AI visibility problem. The real problem is almost always one of three things — and all three are fixable.",
    date: "May 2026",
    readTime: "6 min read",
  },
  {
    slug: "#",
    category: "GEO Basics",
    title: "The 30 Directories That Actually Move Your AI Ranking",
    excerpt: "Not all directory listings are equal. AI engines cite a specific set of high-authority sources. Here's the list, ranked by impact.",
    date: "May 2026",
    readTime: "8 min read",
  },
  {
    slug: "#",
    category: "GEO Basics",
    title: "GEO vs SEO: What's the Same, What's Different, and What to Do First",
    excerpt: "SEO and GEO share some fundamentals but diverge on what matters most. Here's a plain-English breakdown for business owners.",
    date: "April 2026",
    readTime: "5 min read",
  },
  {
    slug: "#",
    category: "Technical",
    title: "What is llms.txt and Why Every Business Website Needs One",
    excerpt: "A single file on your website can dramatically improve how AI engines read and cite your content. Here's what it is and how to add it.",
    date: "April 2026",
    readTime: "4 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <Newspaper className="h-3.5 w-3.5" />
            Blog
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-fg)",
            }}
          >
            GEO guides for{" "}
            <span style={{ color: "var(--color-primary)" }}>real businesses</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--color-fg-muted)]">
            Practical strategies for showing up where your customers are asking.
          </p>
        </section>

        {/* Posts */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="space-y-4">
            {POSTS.map((post) => (
              <Link
                key={post.title}
                href={post.slug}
                className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-primary)] transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "rgba(150,162,131,0.15)",
                      color: "var(--color-primary)",
                    }}
                  >
                    {post.category}
                  </span>
                  <span className="text-xs text-[var(--color-fg-muted)]">{post.date} · {post.readTime}</span>
                </div>
                <h2 className="font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary)] transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{post.excerpt}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                  Read more <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
