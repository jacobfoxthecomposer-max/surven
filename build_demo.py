"""Assemble the Surven Tracker demo HTML with the hero PNG inlined as base64."""
from pathlib import Path
import math, random

ROOT = Path("/Users/jacobkindall/Documents/Obsidian Vault/1-Projects/surven")
HERO_B64 = (ROOT / "tracker-hero.b64").read_text().strip()

# --- Chart data: 12 weeks of visibility score, deterministic + gentle variance ---
random.seed(42)
weeks = 12
base = [52, 54, 55, 53, 56, 58, 60, 62, 64, 66, 69, 72]
# slight jitter for authenticity
scores = [min(100, max(0, v + random.randint(-1, 1))) for v in base]
# For the trend area we also produce x,y normalized
chart_w, chart_h = 880, 240
pad_l, pad_r, pad_t, pad_b = 40, 24, 24, 36
plot_w = chart_w - pad_l - pad_r
plot_h = chart_h - pad_t - pad_b
y_min, y_max = 40, 80  # restricted y-axis range for tighter visualization
def pt(i, v):
    x = pad_l + plot_w * (i / (weeks - 1))
    y = pad_t + plot_h * (1 - (v - y_min) / (y_max - y_min))
    return (x, y)
points = [pt(i, v) for i, v in enumerate(scores)]
path_line = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in points)
path_area = path_line + f" L {points[-1][0]:.1f},{pad_t + plot_h:.1f} L {points[0][0]:.1f},{pad_t + plot_h:.1f} Z"
# Gridlines (horizontal): 40/50/60/70/80
gridlines = []
for v in [40, 50, 60, 70, 80]:
    y = pad_t + plot_h * (1 - (v - y_min) / (y_max - y_min))
    gridlines.append((v, y))
# X labels — every 2 weeks
xlabels = []
for i in range(0, weeks, 2):
    x = pad_l + plot_w * (i / (weeks - 1))
    xlabels.append((i, x))
# Compose SVG string
gridline_markup = "\n".join(
    f'<line x1="{pad_l}" x2="{chart_w-pad_r}" y1="{y:.1f}" y2="{y:.1f}" stroke="#1f1f30" stroke-width="1" />'
    f'<text x="{pad_l-8}" y="{y+4:.1f}" text-anchor="end" class="chart-axis">{v}</text>'
    for v, y in gridlines
)
xlabel_markup = "\n".join(
    f'<text x="{x:.1f}" y="{chart_h-12}" text-anchor="middle" class="chart-axis">W{i+1}</text>'
    for i, x in xlabels
)
# Endpoint markers
last_x, last_y = points[-1]
first_x, first_y = points[0]
# All data point dots
dots_markup = "\n".join(
    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" class="chart-dot" />'
    for x, y in points
)
# Annotation callout at final point
annot_x = last_x - 84
annot_y = last_y - 34

# --- Recent scans table data ---
scans = [
    ("2026-04-17", 72, +6, ["ChatGPT","Claude","Gemini","Google AI"]),
    ("2026-04-10", 66, +2, ["ChatGPT","Gemini","Google AI"]),
    ("2026-04-03", 64, +2, ["ChatGPT","Claude","Gemini"]),
    ("2026-03-27", 62, +2, ["ChatGPT","Claude"]),
    ("2026-03-20", 60, +2, ["ChatGPT","Gemini"]),
    ("2026-03-13", 58, +3, ["ChatGPT","Gemini","Google AI"]),
]

def chips(models):
    return "".join(f'<span class="chip">{m}</span>' for m in models)

scans_rows = "\n".join(
    f'''<tr>
      <td class="mono">{d}</td>
      <td class="mono num">{s}</td>
      <td class="mono num {'pos' if delta >= 0 else 'neg'}">{'+' if delta >= 0 else ''}{delta}</td>
      <td class="chips-cell">{chips(models)}</td>
      <td class="row-action"><button class="icon-btn" aria-label="Export row">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12"/></svg>
      </button></td>
    </tr>'''
    for d, s, delta, models in scans
)

# --- AI platform cards ---
platforms = [
    {
        "name": "ChatGPT", "model": "gpt-4o-mini",
        "mention": 78, "rank": 2, "delta": +4,
        "snippet": "For family dentists in Portland, Northstar Dental is frequently recommended for preventive care and patient-friendly scheduling.",
        "swatch": "#06B6D4",
    },
    {
        "name": "Claude", "model": "claude-haiku-4-5",
        "mention": 69, "rank": 3, "delta": +7,
        "snippet": "Northstar Dental (Portland, OR) is often cited for emergency same-day visits and transparent pricing.",
        "swatch": "#8B5CF6",
    },
    {
        "name": "Gemini", "model": "gemini-1.5-flash",
        "mention": 61, "rank": 4, "delta": +2,
        "snippet": "Among top-rated Portland dental clinics, Northstar Dental appears alongside long-established practices in the Pearl District.",
        "swatch": "#22D3EE",
    },
    {
        "name": "Google AI", "model": "AI Overview · SerpAPI",
        "mention": 54, "rank": 5, "delta": +1,
        "snippet": "The AI Overview surfaces Northstar Dental in results for \"best family dentist Portland\" and \"same-day dental Portland OR\".",
        "swatch": "#A78BFA",
    },
]

def platform_card(p):
    delta_cls = "pos" if p["delta"] >= 0 else "neg"
    delta_sign = "+" if p["delta"] >= 0 else ""
    return f'''
    <article class="platform-card">
      <header class="platform-head">
        <div class="platform-id">
          <span class="swatch" style="background:{p['swatch']}"></span>
          <div>
            <div class="platform-name">{p['name']}</div>
            <div class="platform-model mono">{p['model']}</div>
          </div>
        </div>
        <span class="delta {delta_cls} mono">{delta_sign}{p['delta']}</span>
      </header>
      <div class="platform-metrics">
        <div class="metric">
          <div class="metric-label">Mention rate</div>
          <div class="metric-value mono num">{p['mention']}<span class="unit">%</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">Rank</div>
          <div class="metric-value mono num">#{p['rank']}</div>
        </div>
      </div>
      <blockquote class="snippet">"{p['snippet']}"</blockquote>
    </article>'''

platform_cards = "\n".join(platform_card(p) for p in platforms)

HTML = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Surven Tracker — Northstar Dental</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg:        #0B0B14;
    --surface:   #13131F;
    --elevated:  #1A1A2B;
    --border:    #26263A;
    --border-2:  #1f1f30;
    --fg:        #F8FAFC;
    --muted:     #94A3B8;
    --muted-2:   #64748B;
    --violet:    #8B5CF6;
    --cyan:      #06B6D4;
    --success:   #22C55E;
    --danger:    #EF4444;
    --shadow:    0 1px 0 rgba(255,255,255,0.02), 0 8px 24px -16px rgba(0,0,0,0.6);
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 6px;
    --radius-xs: 2px;
    --grid: 1280px;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; background: var(--bg); color: var(--fg); }}
  body {{
    font-family: "DM Sans", system-ui, sans-serif;
    font-feature-settings: "ss01","cv11";
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
    min-height: 100vh;
  }}
  .mono {{ font-family: "JetBrains Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }}
  .heading {{ font-family: "Space Grotesk", system-ui, sans-serif; letter-spacing: -0.02em; }}

  .wrap {{
    max-width: var(--grid);
    margin: 0 auto;
    padding: 28px 32px 72px;
  }}

  /* --- TOP BAR --- */
  .topbar {{
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow);
  }}
  .topbar-hero {{
    display: block;
    width: 100%;
    height: auto;
  }}
  .topbar-bar {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 20px;
    border-top: 1px solid var(--border-2);
    background: linear-gradient(180deg, rgba(139,92,246,0.04), transparent);
  }}
  .topbar-left {{ display: flex; align-items: center; gap: 14px; }}
  .breadcrumb {{
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 0.02em;
  }}
  .breadcrumb strong {{ color: var(--fg); font-weight: 500; }}
  .tier-badge {{
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--elevated);
    border: 1px solid var(--border);
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--fg);
    letter-spacing: 0.04em;
  }}
  .tier-badge .tier-dot {{
    width: 6px; height: 6px; border-radius: 50%;
    background: linear-gradient(135deg, var(--violet), var(--cyan));
  }}
  .topbar-actions {{ display: flex; gap: 10px; align-items: center; }}
  .btn {{
    appearance: none; border: 1px solid var(--border);
    background: var(--elevated); color: var(--fg);
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-family: inherit; font-size: 13px;
    cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px;
    transition: border-color 180ms ease, background 180ms ease;
  }}
  .btn:hover {{ border-color: #3a3a55; background: #20203a; }}
  .btn.primary {{
    background: var(--fg); color: var(--bg);
    border-color: var(--fg);
  }}
  .btn.primary:hover {{ background: #e2e8f0; }}

  /* --- SECTION LAYOUT --- */
  .section-title {{
    font-family: "JetBrains Mono", monospace;
    font-size: 11px; letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted-2);
    margin: 36px 0 14px;
  }}
  .grid {{ display: grid; gap: 16px; }}
  .g-12 {{ grid-template-columns: repeat(12, 1fr); }}
  .col-8 {{ grid-column: span 8; }}
  .col-4 {{ grid-column: span 4; }}
  .col-6 {{ grid-column: span 6; }}
  .col-3 {{ grid-column: span 3; }}

  .card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
  }}

  /* --- BUSINESS CARD --- */
  .biz {{
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px;
  }}
  .biz-main {{ display: flex; align-items: center; gap: 18px; }}
  .biz-mark {{
    width: 52px; height: 52px; border-radius: 10px;
    background: radial-gradient(circle at 30% 30%, var(--violet), var(--cyan) 90%);
    display: grid; place-items: center;
    color: #fff; font-family: "Space Grotesk"; font-weight: 700; font-size: 22px;
    box-shadow: 0 0 0 1px rgba(139,92,246,0.25) inset;
  }}
  .biz-name {{ font-family: "Space Grotesk"; font-weight: 600; font-size: 22px; letter-spacing: -0.01em; }}
  .biz-meta {{ color: var(--muted); font-size: 14px; margin-top: 2px; }}
  .biz-meta span {{ color: var(--muted-2); margin: 0 8px; }}
  .biz-aside {{ color: var(--muted); font-size: 13px; text-align: right; }}
  .biz-aside .mono {{ color: var(--fg); font-size: 12px; }}

  /* --- VISIBILITY SCORE --- */
  .score-card {{
    display: flex; align-items: flex-start; justify-content: space-between;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px;
    position: relative; overflow: hidden;
  }}
  .score-card::before {{
    content: ""; position: absolute; inset: -1px; pointer-events: none;
    background: radial-gradient(600px 160px at 100% 0%, rgba(139,92,246,0.08), transparent 60%);
  }}
  .score-label {{
    font-family: "JetBrains Mono"; font-size: 11px;
    color: var(--muted-2); letter-spacing: 0.22em; text-transform: uppercase;
  }}
  .score-value {{
    font-family: "Space Grotesk"; font-weight: 600;
    font-size: 112px; line-height: 1; letter-spacing: -0.04em;
    margin-top: 6px;
    background: linear-gradient(180deg, var(--fg), #cbd5e1);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }}
  .score-out {{ color: var(--muted-2); font-family: "Space Grotesk"; font-weight: 500; font-size: 28px; letter-spacing: -0.02em; }}
  .score-delta {{
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(34,197,94,0.10);
    color: var(--success);
    border: 1px solid rgba(34,197,94,0.25);
    padding: 4px 10px; border-radius: 999px;
    font-family: "JetBrains Mono"; font-size: 12px; font-weight: 500;
    margin-top: 10px;
  }}
  .score-note {{ color: var(--muted); font-size: 13px; margin-top: 14px; max-width: 34ch; }}

  .score-side {{
    text-align: right; color: var(--muted); font-size: 13px;
    min-width: 180px;
  }}
  .kv {{ display: grid; grid-template-columns: auto auto; gap: 4px 18px; justify-content: end; margin-top: 6px; }}
  .kv dt {{ color: var(--muted-2); font-family: "JetBrains Mono"; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; }}
  .kv dd {{ margin: 0; color: var(--fg); font-family: "JetBrains Mono"; font-variant-numeric: tabular-nums; }}

  /* --- SCAN LIMITS WIDGET --- */
  .limit-card h4 {{
    margin: 0 0 14px;
    font-family: "Space Grotesk"; font-weight: 500; letter-spacing: -0.01em;
    font-size: 16px;
  }}
  .limit-bar {{
    position: relative; height: 8px;
    background: var(--elevated);
    border-radius: 999px; overflow: hidden;
  }}
  .limit-fill {{
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 70%;
    background: linear-gradient(90deg, var(--violet), var(--cyan));
    border-radius: 999px;
  }}
  .limit-nums {{
    display: flex; justify-content: space-between;
    margin-top: 10px; font-size: 12px; color: var(--muted);
  }}
  .limit-nums strong {{ color: var(--fg); font-family: "JetBrains Mono"; font-weight: 500; }}
  .limit-note {{
    margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-2);
    font-size: 12px; color: var(--muted-2);
  }}

  /* --- TREND CHART --- */
  .chart-card {{ padding: 20px 22px 4px; }}
  .chart-head {{
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 8px;
  }}
  .chart-head h3 {{
    font-family: "Space Grotesk"; font-weight: 500; font-size: 16px;
    margin: 0; letter-spacing: -0.01em;
  }}
  .chart-legend {{
    display: flex; gap: 14px; font-size: 12px; color: var(--muted);
  }}
  .chart-legend .swatch {{
    display: inline-block; width: 10px; height: 2px; vertical-align: middle; margin-right: 6px;
  }}
  .chart svg {{ display: block; width: 100%; height: auto; }}
  .chart-axis {{ fill: var(--muted-2); font-family: "JetBrains Mono"; font-size: 10px; }}
  .chart-dot {{ fill: var(--cyan); }}
  .chart-annot-box {{ fill: var(--elevated); stroke: var(--border); }}
  .chart-annot-text {{ fill: var(--fg); font-family: "JetBrains Mono"; font-size: 10px; }}

  /* --- PLATFORM CARDS --- */
  .platforms-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }}
  .platform-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 18px;
    display: flex; flex-direction: column; gap: 14px;
    min-height: 220px;
  }}
  .platform-head {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }}
  .platform-id {{ display: flex; align-items: center; gap: 10px; }}
  .swatch {{
    display: inline-block; width: 10px; height: 10px; border-radius: 2px;
    margin-top: 4px;
  }}
  .platform-name {{ font-family: "Space Grotesk"; font-weight: 600; font-size: 15px; }}
  .platform-model {{ color: var(--muted-2); font-size: 11px; margin-top: 2px; }}
  .delta {{
    font-size: 12px; padding: 2px 8px; border-radius: 4px;
  }}
  .delta.pos {{ color: var(--success); background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.22); }}
  .delta.neg {{ color: var(--danger);  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.22); }}
  .platform-metrics {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
  .metric-label {{ color: var(--muted-2); font-family: "JetBrains Mono"; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; }}
  .metric-value {{ font-size: 26px; font-weight: 500; color: var(--fg); margin-top: 4px; letter-spacing: -0.02em; }}
  .metric-value .unit {{ color: var(--muted); font-size: 15px; margin-left: 2px; }}
  .snippet {{
    margin: 0; padding: 12px; font-size: 12.5px; color: var(--muted);
    background: var(--elevated);
    border-left: 2px solid var(--violet);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    line-height: 1.5;
  }}

  /* --- TABLE --- */
  .scans-card {{ padding: 22px; }}
  .scans-head {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }}
  .scans-head h3 {{ font-family: "Space Grotesk"; font-weight: 500; font-size: 16px; margin: 0; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{
    text-align: left;
    color: var(--muted-2);
    font-family: "JetBrains Mono"; font-weight: 500;
    font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
    padding: 10px 10px; border-bottom: 1px solid var(--border-2);
  }}
  td {{
    padding: 14px 10px; border-bottom: 1px solid var(--border-2);
    color: var(--fg); font-size: 13px; vertical-align: middle;
  }}
  tr:last-child td {{ border-bottom: none; }}
  tr:hover td {{ background: rgba(139,92,246,0.03); }}
  .num {{ text-align: right; }}
  td.mono.pos {{ color: var(--success); }}
  td.mono.neg {{ color: var(--danger); }}
  .chip {{
    display: inline-block;
    background: var(--elevated);
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    margin-right: 4px;
    font-family: "JetBrains Mono";
  }}
  .icon-btn {{
    appearance: none; background: transparent; border: 1px solid var(--border);
    color: var(--muted); padding: 6px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: inline-grid; place-items: center;
  }}
  .icon-btn:hover {{ color: var(--fg); border-color: var(--muted-2); }}
  .row-action {{ width: 44px; text-align: right; }}

  /* --- FOOTER --- */
  .footer {{
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid var(--border-2);
    display: flex; justify-content: space-between; align-items: center;
    color: var(--muted-2); font-size: 12px;
  }}
  .footer .mark {{
    display: inline-flex; align-items: center; gap: 8px;
  }}
  .footer .mark-dot {{
    width: 8px; height: 8px; border-radius: 2px;
    background: linear-gradient(135deg, var(--violet), var(--cyan));
  }}
  .footer a {{ color: var(--muted); text-decoration: none; }}
  .footer a:hover {{ color: var(--fg); }}

  @media (max-width: 1080px) {{
    .platforms-grid {{ grid-template-columns: repeat(2, 1fr); }}
    .col-8, .col-4 {{ grid-column: span 12; }}
  }}
  @media (max-width: 640px) {{
    .wrap {{ padding: 16px; }}
    .score-card {{ flex-direction: column; gap: 16px; }}
    .score-value {{ font-size: 80px; }}
    .topbar-bar {{ flex-wrap: wrap; }}
    .platforms-grid {{ grid-template-columns: 1fr; }}
  }}
</style>
</head>
<body>
<main class="wrap">

  <!-- TOP BAR -->
  <header class="topbar">
    <img class="topbar-hero" alt="Surven Tracker" src="data:image/png;base64,{HERO_B64}" />
    <div class="topbar-bar">
      <div class="topbar-left">
        <span class="tier-badge"><span class="tier-dot"></span>Premium</span>
        <span class="breadcrumb">Tracking <strong>Northstar Dental</strong> &nbsp;·&nbsp; Last scan <span class="mono">2026-04-17&nbsp;09:42</span></span>
      </div>
      <div class="topbar-actions">
        <button class="btn" type="button">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12"/></svg>
          Export CSV
        </button>
        <button class="btn primary" type="button">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v14M3 10h14"/></svg>
          Run Scan
        </button>
      </div>
    </div>
  </header>

  <!-- BUSINESS INFO -->
  <div class="section-title">Business</div>
  <section class="card">
    <div class="biz">
      <div class="biz-main">
        <div class="biz-mark">N</div>
        <div>
          <div class="biz-name">Northstar Dental</div>
          <div class="biz-meta">northstardental.com <span>·</span> Portland, OR <span>·</span> Healthcare &nbsp;/&nbsp; Dental</div>
        </div>
      </div>
      <div class="biz-aside">
        <div>Tracking since</div>
        <div class="mono">2026-01-23</div>
      </div>
    </div>
  </section>

  <!-- OVERVIEW: Score + Limits -->
  <div class="section-title">Overview</div>
  <div class="grid g-12">
    <div class="col-8">
      <section class="score-card">
        <div>
          <div class="score-label">Visibility Score</div>
          <div>
            <span class="score-value">72</span><span class="score-out">&thinsp;/&thinsp;100</span>
          </div>
          <div class="score-delta">
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10V2m0 0l-3 3m3-3l3 3"/></svg>
            +6 this week
          </div>
          <p class="score-note">Aggregate presence across ChatGPT, Claude, Gemini, and Google AI Overview. Deterministic base score with per-scan variance to surface real movement.</p>
        </div>
        <div class="score-side">
          <dl class="kv">
            <dt>Models</dt>    <dd>4&nbsp;/&nbsp;4</dd>
            <dt>Mentions</dt>  <dd>262</dd>
            <dt>Prompts</dt>   <dd>48</dd>
            <dt>Citations</dt> <dd>31</dd>
          </dl>
        </div>
      </section>
    </div>
    <div class="col-4">
      <section class="card limit-card">
        <h4>Daily Scans</h4>
        <div class="limit-bar"><div class="limit-fill"></div></div>
        <div class="limit-nums"><span><strong>14</strong> used</span><span><strong>20</strong> limit</span></div>
        <div class="limit-note">Premium tier · 10 s cooldown between scans · resets 00:00 UTC</div>
      </section>
    </div>
  </div>

  <!-- TREND -->
  <div class="section-title">12-Week Trend</div>
  <section class="card chart-card">
    <div class="chart-head">
      <h3>Visibility Score · Weekly</h3>
      <div class="chart-legend">
        <span><span class="swatch" style="background:var(--cyan)"></span>Score</span>
        <span><span class="swatch" style="background:var(--violet);opacity:.55"></span>Area</span>
      </div>
    </div>
    <div class="chart">
      <svg viewBox="0 0 {chart_w} {chart_h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.02"/>
          </linearGradient>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stop-color="#8B5CF6"/>
            <stop offset="100%" stop-color="#06B6D4"/>
          </linearGradient>
        </defs>
        {gridline_markup}
        <path d="{path_area}" fill="url(#area)" stroke="none"/>
        <path d="{path_line}" fill="none" stroke="url(#line)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        {dots_markup}
        <!-- Endpoint emphasis -->
        <circle cx="{last_x:.1f}" cy="{last_y:.1f}" r="6" fill="none" stroke="#06B6D4" stroke-width="1.5" />
        <circle cx="{last_x:.1f}" cy="{last_y:.1f}" r="3" fill="#F8FAFC" />
        <!-- Annotation -->
        <g>
          <rect x="{annot_x:.1f}" y="{annot_y:.1f}" rx="4" width="78" height="22" class="chart-annot-box" />
          <text x="{annot_x+39:.1f}" y="{annot_y+15:.1f}" text-anchor="middle" class="chart-annot-text">W12 · 72</text>
        </g>
        {xlabel_markup}
      </svg>
    </div>
  </section>

  <!-- PLATFORM CARDS -->
  <div class="section-title">Presence by Platform</div>
  <section class="platforms-grid">
    {platform_cards}
  </section>

  <!-- RECENT SCANS -->
  <div class="section-title">Recent Scans</div>
  <section class="card scans-card">
    <div class="scans-head">
      <h3>Scan history</h3>
      <button class="btn" type="button">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12"/></svg>
        Export all
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="num">Score</th>
          <th class="num">Δ WoW</th>
          <th>Models that mentioned</th>
          <th class="num">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {scans_rows}
      </tbody>
    </table>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="mark"><span class="mark-dot"></span>Powered by <strong style="color:var(--fg); font-family:Space Grotesk; font-weight:600;">&nbsp;Surven</strong>&nbsp;— Generative Engine Optimization</div>
    <div>
      <a href="#">Docs</a> &nbsp;·&nbsp; <a href="#">API</a> &nbsp;·&nbsp; <a href="#">Status</a>
    </div>
  </footer>
</main>
</body>
</html>
'''

out = ROOT / "tracker-demo.html"
out.write_text(HTML)
print(f"Wrote {out} ({out.stat().st_size:,} bytes)")
