<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Color tokens — never type literal hex

Surven's brand palette has two canonical sources:

- `src/app/globals.css` — CSS custom properties (`--color-primary`, `--color-danger`, etc.) for Tailwind classes and inline styles.
- `src/utils/brandColors.ts` — `SURVEN_SEMANTIC` + `SURVEN_CATEGORICAL` for chart libraries and TS values that need raw hex.

When writing or editing components:
- For UI surfaces use `var(--color-primary)` (or the existing Tailwind class `bg-[var(--color-primary)]`).
- For chart fills, gradient stops, etc. import from `brandColors.ts`.
- **Do not paste literal brand hex codes** (`#7D8E6C`, `#96A283`, `#B54631`, `#C97B45`, `#C9A95B`, `#A09890`) into a component. They go stale the moment the brand is tweaked.
- If a value you need isn't in the tokens, add it to both files first, then reference it.
