"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  BarChart3,
  MessageSquare,
  Eye,
  GitCompare,
  BookOpen,
  AlertCircle,
  Settings,
  ChevronDown,
  Upload,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { cn } from "@/utils/cn";

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Advanced Tracker", href: "/dashboard", icon: TrendingUp },
      { label: "Brand Sentiment", href: "/dashboard", icon: Users },
      { label: "Competitor Comparison", href: "/dashboard", icon: GitCompare },
      { label: "AI Benchmark", href: "/dashboard", icon: BarChart3 },
      { label: "Performance Trends", href: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Research & Insights",
    items: [
      { label: "Prompts", href: "/dashboard", icon: MessageSquare },
      { label: "Citation Insights", href: "/dashboard", icon: Eye },
      { label: "Keyword Research", href: "/dashboard", icon: BookOpen },
    ],
  },
  {
    title: "Optimization",
    items: [
      { label: "Content Audit", href: "/audit", icon: BarChart3 },
      { label: "Alerts", href: "/dashboard", icon: AlertCircle },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "API Keys & Preferences", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { business } = useBusiness();
  const { plan } = useUserProfile();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["Overview", "Analytics"])
  );

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const isItemActive = (href?: string) => {
    if (!href) return false;
    return pathname === href;
  };

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-64 border-r border-[var(--color-border)] bg-[var(--color-bg)] overflow-y-auto z-30 flex flex-col">
      {/* Main sidebar content */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider hover:text-[var(--color-fg)] transition-colors"
            >
              {section.title}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  expandedSections.has(section.title) ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>

            {expandedSections.has(section.title) && (
              <div className="space-y-1 mt-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.label}
                    item={item}
                    active={isItemActive(item.href)}
                    disabled={item.disabled}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Profile section */}
      <div className="border-t border-[var(--color-border)] p-3 space-y-3">
        <ProfileCard user={user} business={business} plan={plan} />
      </div>
    </aside>
  );
}

function NavItem({
  item,
  active,
  disabled,
}: {
  item: SidebarItem;
  active: boolean;
  disabled?: boolean;
}) {
  const Icon = item.icon;

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-fg-muted)] opacity-50 cursor-not-allowed">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && (
          <span className="text-xs bg-[var(--color-surface)] px-2 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  if (!item.href) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-fg-muted)]">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && (
          <span className="text-xs bg-[var(--color-surface)] px-2 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-[var(--color-surface)] text-[var(--color-fg)]"
          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]/50"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.badge && (
        <span className="text-xs bg-[var(--color-surface)] px-2 py-0.5 rounded">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function ProfileCard({
  user,
  business,
  plan,
}: {
  user: any;
  business: any;
  plan?: string;
}) {
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  return (
    <div className="bg-[var(--color-surface)] rounded-lg p-3 space-y-3">
      {/* Avatar + Upload */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="absolute -bottom-1 -right-1 h-5 w-5 bg-[var(--color-fg-muted)] rounded-full flex items-center justify-center text-[var(--color-bg)] hover:bg-[var(--color-fg)] transition-colors"
          >
            <Upload className="h-3 w-3" />
          </button>
          {showUploadMenu && (
            <div className="absolute bottom-12 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-2 w-32 z-50">
              <button className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors">
                Upload Photo
              </button>
              <button className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors">
                Remove
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 ml-3 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-fg)] truncate">
            {business?.name || "Business"}
          </p>
          <p className="text-xs text-[var(--color-fg-muted)] truncate">
            {user?.email || "No email"}
          </p>
        </div>
      </div>

      {/* Plan badge */}
      <div className="bg-[var(--color-bg)] rounded px-2 py-1 text-center">
        <p className="text-xs font-medium text-[var(--color-fg-muted)]">Plan</p>
        <p className="text-xs font-semibold text-[var(--color-fg)] capitalize">
          {plan || "Loading..."}
        </p>
      </div>
    </div>
  );
}
