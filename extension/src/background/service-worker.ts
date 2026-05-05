/**
 * Service worker for the Surven extension.
 *
 * Currently does one thing: opens the side panel when the user clicks the
 * extension icon. The audit itself is driven from the side panel (App.tsx)
 * which calls /api/audit/run directly — there is no in-worker audit fallback.
 *
 * (Earlier versions had a RUN_AUDIT message handler that ran a local audit
 * via shared/analyzeWebsite. That path was unreachable — the side panel never
 * sent RUN_AUDIT — so it's been removed to reduce maintenance surface.)
 */

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
