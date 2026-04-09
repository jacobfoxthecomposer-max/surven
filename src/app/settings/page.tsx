"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { BusinessTab } from "@/features/settings/pages/BusinessTab";
import { AccountTab } from "@/features/settings/pages/AccountTab";
import { IntegrationsTab } from "@/features/settings/pages/IntegrationsTab";
import { PromptsTab } from "@/features/settings/pages/PromptsTab";
import { cn } from "@/utils/cn";

type Tab = "business" | "account" | "prompts" | "integrations";

const tabs: { id: Tab; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "account", label: "Account" },
  { id: "prompts", label: "Prompts" },
  { id: "integrations", label: "Integrations" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("business");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-[var(--color-fg-secondary)]">
            Manage your account and business information
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--color-border)]">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 px-1 text-sm font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                    : "text-[var(--color-fg-muted)] border-transparent hover:text-[var(--color-fg)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-2xl">
          {activeTab === "business" && <BusinessTab />}
          {activeTab === "account" && <AccountTab />}
          {activeTab === "prompts" && <PromptsTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
