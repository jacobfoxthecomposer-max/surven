"""Generate the Surven Tracker hero/wordmark PNG.
Quiet Signal philosophy: deep violet-black canvas, one wordmark, one gradient-tinted constellation.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os, base64

W, H = 2400, 480  # 2x supersample for crisp rendering, we'll downscale to 1200x240
SCALE = 2

BG       = (11, 11, 20)       # #0B0B14
FG       = (248, 250, 252)    # #F8FAFC
MUTED    = (148, 163, 184)    # #94A3B8
VIOLET   = (139, 92, 246)     # #8B5CF6
CYAN     = (6, 182, 212)      # #06B6D4

FONT_DIR = "/Users/jacobkindall/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/4a645140-1258-4139-975c-fc3f2a5ad2e7/16252c6c-deda-474c-b03e-a8e7e619f488/skills/canvas-design/canvas-fonts"
WORDMARK_FONT = os.path.join(FONT_DIR, "BricolageGrotesque-Bold.ttf")
LABEL_FONT    = os.path.join(FONT_DIR, "JetBrainsMono-Regular.ttf")

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i]) * t) for i in range(3))

def draw_hero():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")

    # --- Subtle vignette via radial dark-to-darker ambient
    # Keep flat; philosophy is restraint.

    # --- Wordmark ---
    font_word = ImageFont.truetype(WORDMARK_FONT, 180)
    text = "SURVEN"
    # Compute text size
    bbox = d.textbbox((0,0), text, font=font_word)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    tx = 140
    ty = (H - th)//2 - 30
    d.text((tx, ty), text, font=font_word, fill=FG)

    # Tracker tagline (small, muted, mono, uppercase tracking)
    font_label = ImageFont.truetype(LABEL_FONT, 28)
    tag = "T R A C K E R   \u00B7   G E N E R A T I V E   E N G I N E   O P T I M I Z A T I O N"
    tbbox = d.textbbox((0,0), tag, font=font_label)
    d.text((tx + 6, ty + th + 24), tag, font=font_label, fill=MUTED)

    # Accent dot — the single gradient mark next to the wordmark
    # Gradient circle: filled with violet->cyan radial
    dot_r = 22
    dot_cx = tx + (bbox[2]-bbox[0]) + 36
    dot_cy = ty + th//2 + 6
    # Build gradient dot on a separate layer
    dot_layer = Image.new("RGBA", (dot_r*6, dot_r*6), (0,0,0,0))
    dd = ImageDraw.Draw(dot_layer)
    cx, cy = dot_r*3, dot_r*3
    for rr in range(dot_r, 0, -1):
        t = 1 - rr/dot_r
        col = lerp(VIOLET, CYAN, t)
        dd.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], fill=col+(255,))
    # Soft glow
    glow = dot_layer.filter(ImageFilter.GaussianBlur(radius=18))
    img.paste(glow, (dot_cx - dot_r*3, dot_cy - dot_r*3), glow)
    img.paste(dot_layer, (dot_cx - dot_r*3, dot_cy - dot_r*3), dot_layer)

    # --- Constellation / pulse rings to the right ---
    # Rings emanating from a focal node, reading as "presence radiating"
    focal_x = int(W * 0.78)
    focal_y = H // 2
    # Faint concentric rings
    for i, r in enumerate([60, 110, 170, 240, 320]):
        # Opacity falls with radius
        op = int(70 - i*12)
        d.ellipse([focal_x-r, focal_y-r, focal_x+r, focal_y+r],
                  outline=(139, 92, 246, max(op, 18)), width=2)

    # Cyan-tinted outer arcs (partial rings) for asymmetry
    import math as m
    def partial_ring(cx, cy, r, start_deg, end_deg, color, width=3, op=160):
        box = [cx-r, cy-r, cx+r, cy+r]
        d.arc(box, start=start_deg, end=end_deg, fill=color+(op,), width=width)
    partial_ring(focal_x, focal_y, 200, -40, 50, CYAN, width=3, op=160)
    partial_ring(focal_x, focal_y, 270, 110, 220, VIOLET, width=3, op=140)
    partial_ring(focal_x, focal_y, 350, -10, 70, CYAN, width=2, op=90)

    # Nodes scattered on a few orbits — citations radiating
    import random
    random.seed(7)
    nodes = []
    for orbit_r, n in [(110, 4), (170, 5), (240, 6)]:
        base_a = random.uniform(0, 2*m.pi)
        for k in range(n):
            a = base_a + k*(2*m.pi/n) + random.uniform(-0.18, 0.18)
            x = focal_x + orbit_r * m.cos(a)
            y = focal_y + orbit_r * m.sin(a)
            nodes.append((x, y, orbit_r))
    # Connect some nodes with thin lines (constellation feel)
    for i in range(len(nodes)):
        for j in range(i+1, len(nodes)):
            dx = nodes[i][0]-nodes[j][0]; dy = nodes[i][1]-nodes[j][1]
            dist = (dx*dx+dy*dy) ** 0.5
            if 70 < dist < 160 and random.random() < 0.35:
                d.line([(nodes[i][0], nodes[i][1]), (nodes[j][0], nodes[j][1])],
                       fill=(139, 92, 246, 55), width=1)
    # Draw nodes on top (tinted along violet->cyan by orbit)
    for x, y, orbit_r in nodes:
        t = min(1.0, (orbit_r-110)/(240-110))
        col = lerp(VIOLET, CYAN, t)
        nr = 6
        # soft halo
        halo = Image.new("RGBA", (nr*10, nr*10), (0,0,0,0))
        hd = ImageDraw.Draw(halo)
        for rr in range(nr*4, 0, -1):
            alpha = max(0, int(60 * (1 - rr/(nr*4))**2))
            hd.ellipse([nr*5-rr, nr*5-rr, nr*5+rr, nr*5+rr], fill=col+(alpha,))
        img.paste(halo, (int(x-nr*5), int(y-nr*5)), halo)
        d.ellipse([x-nr, y-nr, x+nr, y+nr], fill=col+(255,))

    # Focal node — the brightest, where the business sits
    fnr = 10
    d.ellipse([focal_x-fnr-4, focal_y-fnr-4, focal_x+fnr+4, focal_y+fnr+4],
              outline=FG+(255,), width=2)
    d.ellipse([focal_x-fnr, focal_y-fnr, focal_x+fnr, focal_y+fnr], fill=FG+(255,))

    # --- Corner fiducials (the "instrument panel" feel) ---
    fid_color = (148, 163, 184, 110)
    fid_len = 22
    inset = 32
    for (cx, cy, dxs, dys) in [
        (inset, inset,  (1, 0), (0, 1)),           # top-left
        (W-inset, inset, (-1, 0), (0, 1)),         # top-right
        (inset, H-inset, (1, 0), (0, -1)),         # bottom-left
        (W-inset, H-inset, (-1, 0), (0, -1)),      # bottom-right
    ]:
        d.line([(cx, cy), (cx + dxs[0]*fid_len, cy + dxs[1]*fid_len)], fill=fid_color, width=2)
        d.line([(cx, cy), (cx + dys[0]*fid_len, cy + dys[1]*fid_len)], fill=fid_color, width=2)

    # Tiny coordinate label in bottom-right — Quiet Signal signature
    tiny = ImageFont.truetype(LABEL_FONT, 22)
    label = "\u00B7   S / 01   \u00B7   P R E S E N C E   I N D E X"
    lb = d.textbbox((0,0), label, font=tiny)
    d.text((W - (lb[2]-lb[0]) - 64, H - 52), label, font=tiny, fill=(148,163,184,180))

    # Downsample for crisp anti-aliasing
    out = img.resize((W//SCALE, H//SCALE), Image.LANCZOS)
    return out

if __name__ == "__main__":
    out_path = "/Users/jacobkindall/Documents/Obsidian Vault/1-Projects/surven/tracker-hero.png"
    img = draw_hero()
    img.save(out_path, "PNG", optimize=True)
    # Emit base64 for inlining
    with open(out_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    with open("/Users/jacobkindall/Documents/Obsidian Vault/1-Projects/surven/tracker-hero.b64", "w") as f:
        f.write(b64)
    print(f"Wrote {out_path}   ({os.path.getsize(out_path):,} bytes, {len(b64):,} b64 chars)")
