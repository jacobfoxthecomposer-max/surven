"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, LayoutDashboard, CheckSquare, Square, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/atoms/Button";

type ExportMode = "full" | "custom" | "report";

interface ChartOption {
  id: string;
  label: string;
  sectionId: string;
}

const CHART_OPTIONS: ChartOption[] = [
  { id: "scores", label: "AI Visibility Score Comparison", sectionId: "scores-section" },
  { id: "heatmap", label: "Platform Visibility Heatmap", sectionId: "heatmap-section" },
  { id: "gaps", label: "Competitive Gaps & Advantages", sectionId: "gaps-section" },
  { id: "citations", label: "Top Cited Domains", sectionId: "citations-section" },
];

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  businessName: string;
  scanDate: string | null;
}

export function ExportModal({ open, onClose, businessName, scanDate }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>("full");
  const [selected, setSelected] = useState<Set<string>>(new Set(CHART_OPTIONS.map((c) => c.id)));
  const [zoom, setZoom] = useState(100);
  const [exporting, setExporting] = useState(false);

  function toggleChart(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      if (mode === "report") {
        await exportPrintableReport(businessName, scanDate);
      } else if (mode === "full") {
        await exportFullDashboard(zoom);
      } else {
        await exportCustomSelection(Array.from(selected), zoom);
      }
    } finally {
      setExporting(false);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--color-fg)]">Export Report</h2>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode selector */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-[var(--color-fg-muted)] mb-3">Choose export format:</p>

              {[
                {
                  id: "full" as ExportMode,
                  icon: LayoutDashboard,
                  title: "Full Dashboard",
                  desc: "Screenshot of the entire competitor dashboard as PDF",
                },
                {
                  id: "custom" as ExportMode,
                  icon: CheckSquare,
                  title: "Custom Selection",
                  desc: "Pick which charts and sections to include",
                },
                {
                  id: "report" as ExportMode,
                  icon: FileText,
                  title: "Printable Report",
                  desc: "Clean branded report with key metrics and insights",
                },
              ].map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    mode === id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      mode === id ? "text-[var(--color-primary)]" : "text-[var(--color-fg-muted)]"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        mode === id ? "text-[var(--color-fg)]" : "text-[var(--color-fg-secondary)]"
                      }`}
                    >
                      {title}
                    </p>
                    <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Mode-specific options */}
            {(mode === "full" || mode === "custom") && (
              <div className="px-5 pb-4 space-y-3">
                {/* Zoom control */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-fg-muted)] w-10 shrink-0">Zoom</span>
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 10))}
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)] relative">
                    <div
                      className="h-1.5 rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${((zoom - 50) / 150) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => setZoom((z) => Math.min(200, z + 10))}
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-[var(--color-fg-muted)] w-8 text-right shrink-0">
                    {zoom}%
                  </span>
                </div>

                {/* Chart checkboxes for custom mode */}
                {mode === "custom" && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-[var(--color-fg-muted)]">Select sections to include:</p>
                    {CHART_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => toggleChart(opt.id)}
                        className="w-full flex items-center gap-2 py-1.5 text-left"
                      >
                        {selected.has(opt.id) ? (
                          <CheckSquare className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-[var(--color-fg-muted)] shrink-0" />
                        )}
                        <span className="text-xs text-[var(--color-fg)]">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                disabled={exporting || (mode === "custom" && selected.size === 0)}
              >
                {exporting ? "Exporting..." : "Download PDF"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

async function exportFullDashboard(zoom: number) {
  const { default: html2canvas } = await import("html2canvas");
  const { default: jsPDF } = await import("jspdf");

  const element = document.getElementById("competitor-dashboard");
  if (!element) return;

  const scale = zoom / 100;
  const canvas = await html2canvas(element, {
    scale: scale * 2,
    useCORS: true,
    backgroundColor: "#F2EEE3",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height / canvas.width) * pdfWidth;

  if (pdfHeight > pdf.internal.pageSize.getHeight()) {
    const pages = Math.ceil(pdfHeight / pdf.internal.pageSize.getHeight());
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(
        imgData,
        "PNG",
        0,
        -(i * pdf.internal.pageSize.getHeight()),
        pdfWidth,
        pdfHeight
      );
    }
  } else {
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  }

  pdf.save("competitor-analysis.pdf");
}

async function exportCustomSelection(selectedIds: string[], zoom: number) {
  const { default: html2canvas } = await import("html2canvas");
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  let isFirst = true;
  const scale = zoom / 100;

  for (const opt of CHART_OPTIONS) {
    if (!selectedIds.includes(opt.id)) continue;

    const el = document.getElementById(opt.sectionId);
    if (!el) continue;

    const canvas = await html2canvas(el, {
      scale: scale * 2,
      useCORS: true,
      backgroundColor: "#F2EEE3",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeight = (canvas.height / canvas.width) * pdfWidth;

    if (!isFirst) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
    isFirst = false;
  }

  if (!isFirst) pdf.save("competitor-analysis-custom.pdf");
}

async function exportPrintableReport(businessName: string, scanDate: string | null) {
  const { default: html2canvas } = await import("html2canvas");
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;

  // Header
  pdf.setFillColor(242, 238, 227);
  pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

  pdf.setFontSize(20);
  pdf.setTextColor(26, 28, 26);
  pdf.text("Competitor Analysis Report", margin, 50);

  pdf.setFontSize(11);
  pdf.setTextColor(107, 109, 107);
  pdf.text(`Business: ${businessName}`, margin, 68);
  if (scanDate) {
    pdf.text(
      `Scan Date: ${new Date(scanDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      margin,
      82
    );
  }

  pdf.setDrawColor(150, 162, 131);
  pdf.setLineWidth(1);
  pdf.line(margin, 95, pdfWidth - margin, 95);

  let yOffset = 115;

  for (const opt of CHART_OPTIONS) {
    const el = document.getElementById(opt.sectionId);
    if (!el) continue;

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#F2EEE3",
    });

    const imgData = canvas.toDataURL("image/png");
    const availWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height / canvas.width) * availWidth;

    if (yOffset + imgHeight > pdfHeight - margin) {
      pdf.addPage();
      pdf.setFillColor(242, 238, 227);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
      yOffset = margin;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(107, 109, 107);
    pdf.text(opt.label.toUpperCase(), margin, yOffset);
    yOffset += 10;

    pdf.addImage(imgData, "PNG", margin, yOffset, availWidth, imgHeight);
    yOffset += imgHeight + 24;
  }

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(107, 109, 107);
  pdf.text(
    `Generated by Surven · ${new Date().toLocaleDateString()}`,
    margin,
    pdfHeight - 16
  );

  pdf.save(`${businessName.replace(/\s+/g, "_")}_competitor_report.pdf`);
}
