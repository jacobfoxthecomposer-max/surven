"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";

const integrations = [
  {
    name: "Google Stitch",
    description: "Automated data warehousing of scan results",
    status: "coming-soon" as const,
  },
  {
    name: "21st.dev",
    description: "Competitor enrichment and discovery",
    status: "coming-soon" as const,
  },
];

export function IntegrationsTab() {
  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <div
          key={integration.name}
          className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{integration.name}</h3>
              <p className="mt-1 text-sm text-[var(--color-fg-secondary)]">
                {integration.description}
              </p>
            </div>
            <Badge variant="info">
              <Clock className="h-3 w-3 mr-1.5" />
              Coming Soon
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
