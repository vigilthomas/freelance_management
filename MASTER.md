# Forge — Design System (MASTER)

Single source of truth for every visual and motion decision. Code tokens live in `app/src/ui/tokens.css` and `app/tailwind.config.ts`; both mirror this file.

## Theses

**Visual thesis.** A warm, light-first "editorial workbench":
- **Color:** paper off-white and deep ink, with one vivid, user-configurable accent (default ember `#FF5A36`). Dark mode is an ink-black twin.
- **Type:** Bricolage Grotesque for display, set heavy (700–800) and large against compact Inter UI text, for strong size contrast.
- **Spacing:** airy, on a 4px base unit. Cards are padded 20–24px, and sections are separated by 32–48px.
- **Components:** soft, layered surfaces. Generous radius (14px controls, 20px cards, 28px hero panels), 1px hairline borders, and low diffuse shadows. Grain and gradient-mesh texture appear only on hero surfaces (login, dashboard header).

**Interaction thesis.**
- **Timing:** medium-fast, 160–320ms. Layout changes (reorder, filtering, nav pill) use one spring: stiffness 420, damping 34, no visible overshoot.
- **Hover:** cards lift 2px and deepen their shadow. Buttons shift tone, and press scales to 0.97.
- **Lists:** entrances stagger at 35ms per item, once per mount.
- **Pages:** fade-rise 8px on route change.
- **Scroll:** no scroll-linked effects at all.
- **Forbidden:** elastic or bouncy overshoot, animating width/height/top/left (use transforms and Framer `layout`), parallax, scroll-jacking, and infinite decorative loops. The one exception is the hero mesh drift (24s), which stops under reduced motion.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#F6F3EE` | `#0F1115` | app background |
| `--surface` | `#FFFFFF` | `#181B21` | cards, sheets |
| `--surface-2` | `#EFEBE4` | `#1F232B` | sunken inputs, hover rows |
| `--ink` | `#15171C` | `#F2EFE9` | primary text |
| `--muted` | `#6B6F7A` | `#8B90A0` | secondary text |
| `--line` | `#E4DFD6` | `#2A2E37` | borders, dividers |
| `--accent` | `#FF5A36` (from settings) | same | primary actions, focus, active nav |
| `--accent-ink` | `#FFFFFF` | `#FFFFFF` | text on accent |
| `--accent-soft` | accent 14% | accent 18% | selected backgrounds |
| `--success` | `#15803D` | `#4ADE80` | |
| `--warning` | `#B45309` | `#FBBF24` | |
| `--danger` | `#DC2626` | `#F87171` | destructive |

Text contrast: ink on paper is 16:1 and muted on paper is 4.9:1. White on the default accent is used only at 15px+ semibold (button labels), where it meets the large-text 3:1 threshold.

## Typography

- Display: `"Bricolage Grotesque Variable"`, weights 700–800, letter-spacing −0.02em.
- UI: `"Inter Variable"`, 400/500/600.
- Scale (rem): 0.75 · 0.8125 · 0.875 (body) · 1 · 1.25 · 1.5 · 2 · 2.75 (page title, display) · 3.5 (hero).
- Line-height: 1.5 for body, 1.1 for display.
- Numbers: `font-variant-numeric: tabular-nums` for money and durations.

## Spacing

The base unit is 4px. Scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64.

## Radius

`--r-sm 10px` (badges, chips) · `--r-md 14px` (inputs, buttons) · `--r-lg 20px` (cards, sheets) · `--r-xl 28px` (hero) · `full`.

## Shadows

- `--shadow-1`: `0 1px 2px rgb(21 23 28 / .06)` (resting card)
- `--shadow-2`: `0 6px 20px -6px rgb(21 23 28 / .14)` (hover card, popover)
- `--shadow-3`: `0 24px 60px -12px rgb(21 23 28 / .28)` (sheet, dialog)

Dark mode uses black at 2× the alpha.

## Motion tokens

| Token | Value |
|---|---|
| `fast` | 160ms, `cubic-bezier(.2,.8,.2,1)` (hover, press, color) |
| `normal` | 240ms, same curve (page fade, toast) |
| `slow` | 320ms (sheet / dialog enter) |
| `spring` | `{ type: 'spring', stiffness: 420, damping: 34 }` (layout, reorder, nav pill) |
| `stagger` | 0.035s |

All motion is wrapped in `<MotionConfig reducedMotion="user">`, and CSS transitions are disabled under `prefers-reduced-motion`.

## Components

- **Button:** height 40 (sm 32), `--r-md`, 600 weight. Variants: primary (accent), secondary (surface + line), ghost, danger. States: hover tone, focus 2px accent ring with 2px offset, active scale .97, disabled 45% opacity.
- **Input/Select:** height 44, `--surface-2` fill, line border on focus switching to accent ring, error state uses a danger border plus a message.
- **Card:** `--surface`, `--line` border, `--r-lg`, `--shadow-1`; interactive cards lift on hover.
- **Badge:** color dot plus label, `--r-sm`, 12px 600.
- **Sheet:** right drawer of 440px on desktop, bottom sheet on mobile, `--shadow-3`.
- **Nav:** an active pill animated with a shared `layoutId`.
