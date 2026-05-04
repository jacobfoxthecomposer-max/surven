"use client";

import { useState, useRef, useEffect } from "react";
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
  Settings,
  ChevronRight,
  Upload,
  Zap,
  Search,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useSidebarContext } from "@/features/sidebar/context/SidebarContext";
import { supabase } from "@/services/supabase";
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
      { label: "AI Visibility Tracker", href: "/ai-visibility-tracker", icon: TrendingUp },
      { label: "Brand Sentiment", href: "/sentiment", icon: Users },
      { label: "Competitor Comparison", href: "/competitor-comparison", icon: GitCompare },
    ],
  },
  {
    title: "Prompts",
    items: [
      { label: "Tracked Prompts", href: "/prompts", icon: MessageSquare },
      { label: "Prompt Research", href: "/prompt-research", icon: BookOpen },
    ],
  },
  {
    title: "Research & Insights",
    items: [
      { label: "Code Scanner", href: "/site-audit", icon: Search },
      { label: "Citation Insights", href: "/citation-insights", icon: Eye },
    ],
  },
  {
    title: "Optimization",
    items: [
      { label: "Website Audit", href: "/audit", icon: BarChart3 },
      { label: "Crawlability Audit", href: "/crawlability-audit", icon: Zap },
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
  const { isExpanded, setIsExpanded } = useSidebarContext();

  const isItemActive = (href?: string) => {
    if (!href) return false;
    return pathname === href;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 h-[calc(100vh-56px)] border-r border-[var(--color-border)] bg-[var(--color-bg)] overflow-y-auto z-30 flex flex-col transition-all duration-300",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Collapse toggle button */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--color-border)]">
        {isExpanded && <div className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">Menu</div>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto flex items-center justify-center h-8 w-8 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "h-5 w-5 transition-transform duration-300",
              !isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Main sidebar content */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            {isExpanded && (
              <div className="px-3 py-1 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  active={isItemActive(item.href)}
                  disabled={item.disabled}
                  isExpanded={isExpanded}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile section */}
      <div className="border-t border-[var(--color-border)] p-3">
        <ProfileCard user={user} business={business} plan={plan} isExpanded={isExpanded} />
      </div>
    </aside>
  );
}

function NavItem({
  item,
  active,
  disabled,
  isExpanded,
}: {
  item: SidebarItem;
  active: boolean;
  disabled?: boolean;
  isExpanded: boolean;
}) {
  const Icon = item.icon;

  if (!item.href) {
    if (isExpanded) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-fg-muted)] opacity-50 cursor-not-allowed">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
        </div>
      );
    }
    return (
      <div className="relative group">
        <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-[var(--color-fg-muted)] opacity-50 cursor-not-allowed">
          <Icon className="h-4 w-4" />
        </div>
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-fg)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          {item.label}
        </div>
      </div>
    );
  }

  if (isExpanded) {
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
          <span className="text-xs bg-[var(--color-bg)] px-2 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="relative group">
      <Link
        href={item.href}
        className={cn(
          "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors",
          active
            ? "bg-[var(--color-surface)] text-[var(--color-fg)]"
            : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]/50"
        )}
      >
        <Icon className="h-4 w-4" />
      </Link>
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-fg)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {item.label}
      </div>
    </div>
  );
}

function ProfileCard({
  user,
  business,
  plan,
  isExpanded,
}: {
  user: any;
  business: any;
  plan?: string;
  isExpanded: boolean;
}) {
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(user?.user_metadata?.avatar_url ?? null);
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setShowUploadMenu(false);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setShowUploadMenu(false);
    await supabase.auth.updateUser({ data: { avatar_url: null } });
    setAvatarUrl(null);
  };

  const initials = user?.email?.[0]?.toUpperCase() || "U";

  const AvatarCircle = ({ size = "h-10 w-10" }: { size?: string }) => (
    <div className={`${size} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : uploading ? (
        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        initials
      )}
    </div>
  );

  if (!isExpanded) {
    return (
      <div className="relative group">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="relative mx-auto w-fit">
          <AvatarCircle />
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="absolute -bottom-1 -right-1 h-5 w-5 bg-[var(--color-fg-muted)] rounded-full flex items-center justify-center text-[var(--color-bg)] hover:bg-[var(--color-fg)] transition-colors"
          >
            <Upload className="h-3 w-3" />
          </button>
          {showUploadMenu && (
            <div className="absolute bottom-8 left-full ml-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-2 w-32 z-50">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors"
              >
                Upload Photo
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
        <div className="absolute left-full ml-2 top-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-fg)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 space-y-0.5">
          <div className="font-semibold">{business?.name || "Business"}</div>
          <div className="text-[var(--color-fg-muted)]">{plan || "Loading..."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg p-3 space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {/* Avatar + Upload */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <AvatarCircle />
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="absolute -bottom-1 -right-1 h-5 w-5 bg-[var(--color-fg-muted)] rounded-full flex items-center justify-center text-[var(--color-bg)] hover:bg-[var(--color-fg)] transition-colors"
          >
            <Upload className="h-3 w-3" />
          </button>
          {showUploadMenu && (
            <div className="absolute bottom-12 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-2 w-32 z-50">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors"
              >
                Upload Photo
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg)] rounded transition-colors"
                >
                  Remove
                </button>
              )}
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
