import { analyzeWebsite } from "../shared/analyzeWebsite";
import type { CrawledPage, AuditFinding } from "../shared/types";

interface CachedAudit {
  findings: AuditFinding[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

console.log("Service worker loaded and registering listener");

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Message received in service worker:", message);
  if (message.type === "RUN_AUDIT") {
    console.log("RUN_AUDIT message detected, starting audit");
    handleRunAudit()
      .then((result) => {
        console.log("Audit complete, sending response:", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Audit error:", error);
        sendResponse({ success: false, error: String(error) });
      });
    return true; // Will send response asynchronously
  }
});

async function handleRunAudit() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { success: false, error: "No active tab found" };
    }

    const tabId = tab.id;
    const url = new URL(tab.url || "");
    const hostname = url.hostname;

    // Check cache first
    const cached = await getCachedAudit(hostname);
    if (cached) {
      return { success: true, findings: cached.findings, fromCache: true };
    }

    // Parse the page via content script
    const parseResult = await chrome.tabs.sendMessage(tabId, { type: "PARSE_PAGE" });

    if (!parseResult.success) {
      return { success: false, error: "Failed to parse page" };
    }

    const page: CrawledPage = parseResult.page;

    // Run the audit
    const findings = analyzeWebsite([page]);

    // Cache the results
    await cacheAudit(hostname, findings);

    return { success: true, findings, fromCache: false };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function getCachedAudit(hostname: string): Promise<CachedAudit | null> {
  try {
    const data = await chrome.storage.local.get(`audit_${hostname}`);
    const cached = data[`audit_${hostname}`] as CachedAudit | undefined;

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      await chrome.storage.local.remove(`audit_${hostname}`);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

async function cacheAudit(hostname: string, findings: AuditFinding[]): Promise<void> {
  const cached: CachedAudit = {
    findings,
    timestamp: Date.now(),
  };

  await chrome.storage.local.set({ [`audit_${hostname}`]: cached });
}
