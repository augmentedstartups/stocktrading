# Design System: Council Quant Desk

## Visual Theme and Atmosphere

Clinical, gallery-airy dashboard with confident asymmetric rhythm and deliberate spring motion. Density sits in daily-app territory with breathable whitespace; variance favors offset grids without chaotic fragmentation.

## Color Palette and Roles

- Canvas White (#F9FAFB) — page backdrop
- Pure Surface (#FFFFFF) — panels and chart wells
- Charcoal Ink (#18181B) — primary copy; never pure black
- Muted Steel (#71717A) — secondary metadata
- Whisper Border (rgba(226, 232, 240, 0.5)) — structural hairlines
- Signal Emerald (#10B981) — primary accent, positive momentum
- Caution Amber (#F59E0B) — hold states
- Risk Rose (#E11D48) — sell / danger

Single accent family only; no neon purple gradients.

## Typography Rules

- Display and UI: Geist Sans via `font-sans`
- Numeric mono: Geist Mono via `number` utility and `font-mono`
- Marketing emphasis: Outfit via `--font-cabinet` on `font-display`
- Inter is excluded; serif excluded from dashboards

## Component Stylings

Primary surfaces use rounded-bento containers (2.5rem), diffused shadow (`shadow-diffuse`), and whisper borders. Liquid glass utility `.glass` stacks backdrop blur with inset highlight for indicator rails.

Buttons employ tactile press feedback (`active:scale-[0.98]`). Icon-only controls demand explicit `aria-label` copy.

## Layout Principles

CSS grid first; max width 1400px; asymmetric splits on desktop collapse to single-column stacks below 768px with horizontal overflow forbidden.

## Motion and Interaction

Spring preset `{ stiffness: 100, damping: 20 }` on micro-interactions; `prefers-reduced-motion` respected via Framer `useReducedMotion`. Indicator chips expose perpetual pulse dots only when reduced motion is off.

## Anti-Patterns

- Emojis as glyphs or icons
- Inter font stack
- Pure black fills
- Neon outer glows on CTAs
- Three equal marketing cards in a row without asymmetry
- `h-screen` heroes — always `min-h-[100dvh]`
