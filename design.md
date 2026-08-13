# Snip Design System

Design language borrowed from Lovable.dev — dark, minimal, with warm gradient accents.

## Color Palette

### Backgrounds
- **Background (dark)**: `#0f0f0f` — near-black page background
- **Surface (cards)**: `#1a1a1a` — slightly elevated card surfaces
- **Surface Hover**: `#262626` — interactive surface state

### Text
- **Text Primary**: `#ffffff` — main text, headings
- **Text Secondary**: `#a0a0a0` — muted labels, descriptions
- **Text Tertiary**: `#6b6b6b` — disabled, meta information

### Accent & Feedback
- **Accent**: `#3b82f6` — primary interactive elements (buttons, links)
- **Accent Hover**: `#2563eb` — button hover state
- **Success**: `#10b981` — success messages, positive feedback
- **Error**: `#ef4444` — error messages, warnings

### Gradient (Hero Glow)
- **Gradient Warm**: Linear 180deg from `rgba(249, 115, 22, 0.15)` → `rgba(236, 72, 153, 0.1)` → `rgba(139, 92, 246, 0.08)` at bottom
  - Coral/orange → pink → purple
  - Soft, diffused, full-viewport width
  - Applied as fixed element behind hero content

## Typography

### Font Stack
`"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Scale
- **Hero Headline (h1)**: 3.5rem (56px), font-weight 700, letter-spacing -0.02em
- **Section Title (h2)**: 2rem (32px), font-weight 600
- **Body**: 1rem (16px), font-weight 400, line-height 1.6
- **Label/Caption**: 0.875rem (14px), font-weight 500, color secondary

## Spacing

- **Gutter (horizontal padding)**: 1.5rem (24px) on desktop, 1rem (16px) on mobile
- **Section gap**: 2rem (32px)
- **Component gap**: 1rem (16px)
- **Internal padding**: 1.5rem (24px)

## Border & Shadow

### Border Radius
- **Card**: 1rem (16px) — generous, modern rounding
- **Input**: 0.75rem (12px) — pill-rounded for chat-style feel
- **Button**: 0.75rem (12px)
- **Glow/gradient**: none (diffuse effect)

### Shadows & Borders
- **Card border**: 1px solid `rgba(255, 255, 255, 0.08)` — subtle, barely visible
- **Card shadow**: `0 1px 3px rgba(0, 0, 0, 0.3)` — soft depth
- **Input shadow on focus**: `0 0 0 3px rgba(59, 130, 246, 0.1)` — glow ring
- **Glow filter**: `blur(80px)` — diffuse, not sharp

## Component Mapping

### Hero / Header
- Page header + muted tagline = Lovable hero section
- Centered, bold headline above subtitle
- Positioned above the gradient glow

### URL Form (Chat-Style Input)
- Large input field with pill-rounded corners (primary centerpiece)
- Action button (Shorten) attached right side
- Form as a single cohesive unit, like a chat message bar
- Generous internal padding, inviting interaction

### Messages (Success / Error)
- Notices as small cards with left-side color accent stripe
- Inherit surface color with left border emphasis
- Clean, non-intrusive feedback

### Links Table
- Table housed in a card (surface bg, border, shadow)
- Generous padding around table
- Header row with secondary text color
- Rows with subtle hover state (surface hover bg)
- Links render as pill-shaped badges or code-style text

## Implementation Notes

1. **Glow is critical**: Fixed, full-width band at page top (`position: fixed; top: 0; left: 0; right: 0; pointer-events: none; z-index: 0`)
   - Must NOT be inside `.container` or any max-width element
   - Behind all content via negative z-index of content

2. **Breathing room**: Ample padding and gaps between elements; no cramped layouts

3. **Minimal chrome**: No gradients on buttons (flat fills), no heavy shadows, just subtle borders

4. **Dark mode by default**: All specs assume dark background; no light mode variant needed for MVP
