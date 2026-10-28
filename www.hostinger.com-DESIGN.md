---
version: alpha
name: Hostinger
description: |
  Hostinger's design system embodies a dark, technology-forward aesthetic built
  for performance-focused hosting services. The palette combines a deep charcoal
  foundation with vibrant electric purple accents, creating a premium,
  cutting-edge feel. The system prioritizes clarity and hierarchy through
  generous whitespace and precise typography, establishing trust through a
  clean, minimalist approach. Large, bold headings and generous spacing convey
  confidence and simplicity, while carefully constrained color usage ensures
  focus on content and calls to action. The design feels modern, professional,
  and optimized—reflecting the sophisticated infrastructure it markets.
source:
  url: "https://www.hostinger.com/id/hosting-vps"
  pagesAnalyzed: 1
  extractedAt: 2026-09-25
  tokensMeasured: true
colors:
  primary: "#222225"
  accent: "#673DE6"
  canvas: "#000000"
  surface: "#101011"
  surface-alt: "#18181A"
  on-primary: "#FFFFFF"
  ink: "#FFFFFF"
  body: "#DEDEE2"
  hairline: "#7B66FF"
typography:
  display:
    fontFamily: "DM Sans"
    fontSize: 48px
    fontWeight: 399
    lineHeight: 1.17
    letterSpacing: -0.24px
  heading-lg:
    fontFamily: "DM Sans"
    fontSize: 36px
    fontWeight: 399
    lineHeight: 1.19
    letterSpacing: 0px
  heading-lg-tight:
    fontFamily: "DM Sans"
    fontSize: 36px
    fontWeight: 399
    lineHeight: 1.22
    letterSpacing: -0.18px
  heading-lg-strong:
    fontFamily: "DM Sans"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.19
    letterSpacing: 0px
  heading-md:
    fontFamily: "DM Sans"
    fontSize: 32px
    fontWeight: 399
    lineHeight: 1.25
    letterSpacing: -0.16px
  heading-sm:
    fontFamily: "DM Sans"
    fontSize: 24px
    fontWeight: 599
    lineHeight: 1.33
    letterSpacing: -0.12px
  heading-xs:
    fontFamily: "DM Sans"
    fontSize: 20px
    fontWeight: 599
    lineHeight: 1.4
    letterSpacing: -0.1px
  body-xl:
    fontFamily: "DM Sans"
    fontSize: 20px
    fontWeight: 399
    lineHeight: 1.4
    letterSpacing: -0.1px
  body-lg:
    fontFamily: "DM Sans"
    fontSize: 16px
    fontWeight: 399
    lineHeight: 1.5
    letterSpacing: 0px
  body-lg-strong:
    fontFamily: "DM Sans"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-lg-2:
    fontFamily: "DM Sans"
    fontSize: 16px
    fontWeight: 599
    lineHeight: 1.5
    letterSpacing: 0px
  body-md:
    fontFamily: "DM Sans"
    fontSize: 14px
    fontWeight: 399
    lineHeight: 1.43
    letterSpacing: 0px
  body-md-strong:
    fontFamily: "DM Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0px
  button-lg:
    fontFamily: "DM Sans"
    fontSize: 18px
    fontWeight: 399
    lineHeight: 1.44
    letterSpacing: -0.09px
  button-md:
    fontFamily: "DM Sans"
    fontSize: 14px
    fontWeight: 599
    lineHeight: 1.43
    letterSpacing: 0px
  label:
    fontFamily: "DM Sans"
    fontSize: 14px
    fontWeight: 399
    lineHeight: 1.71
    letterSpacing: 0px
  caption-xs:
    fontFamily: "DM Sans"
    fontSize: 12px
    fontWeight: 399
    lineHeight: 1.33
    letterSpacing: 0px
  caption-xs-strong:
    fontFamily: "DM Sans"
    fontSize: 12px
    fontWeight: 599
    lineHeight: 1.33
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 8px
  sm: 12px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
borderWidths:
  thin: 1px
  medium: 2px
shadows:
  sm: "rgb(255, 255, 255) 0px 0px 0px 1px"
  md: "rgba(0, 0, 0, 0.1) 0px 4px 10px 0px"
elevationStrategy: progressive
themes:
  derived: light   # the other theme is the site's measured palette
  light:
    bg: "#FAF8FE"
    surface: "#F0EEF4"
    surfaceRaised: "#E9E7EC"
    text: "#15131C"
    textMuted: "#6B6970"
    border: "#D7D5DA"
    accent: "#673DE6"
    accentFg: "#FFFFFF"
    focusRing: "#673DE6"
    elevation: shadow
  dark:
    bg: "#000000"
    surface: "#101011"
    surfaceRaised: "#232324"
    text: "#FFFFFF"
    textMuted: "#DEDEE2"
    border: "#7B66FF"
    accent: "#673DE6"
    accentFg: "#FFFFFF"
    focusRing: "#673DE6"
    elevation: "border+surface"
components:
  button-filled:
    textColor: "rgb(248, 249, 250)"
    border: "1px solid rgba(255, 255, 255, 0.15)"
    height: 66px
    padding: "16px 16px 16px 16px"
    fontSize: 16px
    fontFamily: "DM Sans"
    fontWeight: 600
    lineHeight: 1.5
    rounded: 16px
    backgroundColor: "{colors.surface}"
  button-filled-sm:
    textColor: "{colors.ink}"
    height: 48px
    padding: "12px 48px 12px 48px"
    fontSize: 16px
    fontFamily: "DM Sans"
    fontWeight: 600
    lineHeight: 1.5
    rounded: "{rounded.xs}"
    backgroundColor: "{colors.accent}"
  button-primary:
    typography: "{typography.button-md}"
    textColor: "rgb(248, 249, 250)"
    height: 40px
    padding: "10px 16px 10px 16px"
    rounded: 40px
    backgroundColor: "{colors.primary}"
  button-text:
    textColor: "rgba(255, 255, 255, 0.9)"
    height: 40px
    padding: "8px 16px 8px 16px"
    fontSize: 16px
    fontFamily: "DM Sans"
    fontWeight: 600
    rounded: 999px
  button-text-2:
    textColor: "rgb(248, 249, 250)"
    height: 40px
    padding: "8px 16px 8px 16px"
    fontSize: 16px
    fontFamily: "DM Sans"
    fontWeight: 600
    rounded: 999px
  card:
    typography: "{typography.body-lg}"
    textColor: "rgb(248, 249, 250)"
    border: "2px solid {colors.hairline}"
    padding: "24px 24px 32px 24px"
    rounded: 24px
    backgroundColor: "{colors.surface-alt}"
  card-sm:
    typography: "{typography.body-lg}"
    textColor: "rgb(248, 249, 250)"
    padding: "24px 24px 32px 24px"
    rounded: 24px
    backgroundColor: "{colors.surface-alt}"
  badge-filled:
    typography: "{typography.body-lg}"
    textColor: "{colors.ink}"
    height: 42px
    padding: "8px 24px 8px 24px"
    rounded: "24px 24px 0px 0px"
    backgroundColor: "{colors.hairline}"
  badge-filled-sm:
    typography: "{typography.heading-xs}"
    textColor: "rgb(157, 153, 255)"
    height: 20px
    padding: "2px 8px 2px 8px"
    rounded: "{rounded.xs}"
    backgroundColor: "rgba(123, 102, 255, 0.25)"
  navigation:
    typography: "{typography.body-lg}"
    textColor: "{colors.primary}"
    height: 72px
    boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px 0px"
    backgroundColor: "{colors.canvas}"
  footer:
    typography: "{typography.body-md}"
    textColor: "rgb(248, 249, 250)"
    backgroundColor: "{colors.canvas}"
  link:
    textColor: "{colors.ink}"
    padding: "12px 48px 12px 48px"
    fontSize: 16px
    boxShadow: "{colors.on-primary} 0px 0px 0px 1px"
    fontFamily: "DM Sans"
    fontWeight: 600
    lineHeight: 1.5
    rounded: "{rounded.xs}"
  link-2:
    textColor: "rgb(22, 23, 24)"
    padding: "12px 48px 12px 48px"
    fontSize: 16px
    fontFamily: "DM Sans"
    fontWeight: 600
    lineHeight: 1.5
    rounded: "{rounded.xs}"
    backgroundColor: "{colors.on-primary}"
states:
  other-hover:
    target: other
    state: hover
    opacity: 0.7
  nav-hover:
    target: nav
    state: hover
    opacity: 0.8
  link-hover:
    target: link
    state: hover
    textDecoration: underline
  button-hover:
    target: button
    state: hover
    opacity: 1
  other-disabled:
    target: other
    state: disabled
    opacity: 0.6
  card-hover:
    target: card
    state: hover
    transform: "rotate(-2deg) translateY(-1px)"
  button-active:
    target: button
    state: active
    transform: "translateY(1px)"
  card-disabled:
    target: card
    state: disabled
    opacity: 0.6
  other-focus-visible:
    target: other
    state: focus-visible
    outline: none
  other-active:
    target: other
    state: active
    transform: "scale(0.98)"
  button-disabled:
    target: button
    state: disabled
    opacity: 0.5
  nav-focus:
    target: nav
    state: focus
    outline: none
breakpoints:
  - width: 375
    containerWidth: 343
    gridColumns: 1
    navLinksVisible: 1
    menuToggleVisible: true
    headingPx: 36
    bodyPx: 16
    sectionPaddingX: 0
  - width: 768
    containerWidth: 688
    gridColumns: 3
    navLinksVisible: 1
    menuToggleVisible: true
    headingPx: 36
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1024
    containerWidth: 944
    gridColumns: 3
    navLinksVisible: 1
    menuToggleVisible: true
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1280
    containerWidth: 1200
    gridColumns: 6
    navLinksVisible: 3
    menuToggleVisible: true
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1440
    containerWidth: 1360
    gridColumns: 6
    navLinksVisible: 3
    menuToggleVisible: true
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 0
coverage:
  statesFound: 61
  gradientsFound: 0
  rolesUnassigned: 0
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: true
  semanticRampDeclared: false
---

# Design System Inspired by Hostinger

## 1. Visual Theme & Atmosphere

Hostinger's design system embodies a **dark, technology-forward aesthetic** built for performance-focused hosting services. The palette combines a deep charcoal foundation with vibrant electric purple accents, creating a premium, cutting-edge feel. The system prioritizes clarity and hierarchy through generous whitespace and precise typography, establishing trust through a clean, minimalist approach. Large, bold headings and generous spacing convey confidence and simplicity, while carefully constrained color usage ensures focus on content and calls to action. The design feels modern, professional, and optimized—reflecting the sophisticated infrastructure it markets.

**Key Characteristics**
- Dark-first, low-contrast neutral palette with high-contrast accent usage
- Bold, spacious typography with negative letter-spacing on display sizes
- Pill-shaped interactive elements (buttons, badges) contrasting sharp card corners
- Depth through color blocking and minimal shadow usage
- Accent purple used sparingly for primary CTAs and brand reinforcement
- Generous spacing and breathing room throughout layouts

## 2. Color Palette & Roles

### Primary
- **Brand Accent** (`{colors.accent}` — `#673DE6`): Primary call-to-action buttons, featured card borders, brand emphasis, and interactive highlights.
- **Primary Dark** (`{colors.primary}` — `#222225`): Secondary button fills, active states, and dark surface treatments.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#000000`): Default page background; the base of all layouts.
- **Surface** (`{colors.surface}` — `#101011`): Card and panel backgrounds; primary content containers.
- **Surface Alt** (`{colors.surface-alt}` — `#18181A`): Alternating section bands and secondary container backgrounds.
- **Ink / On Primary** (`{colors.on-primary}` — `#FFFFFF`): Headings, primary body text, and all text on brand-colored surfaces.
- **Body** (`{colors.body}` — `#DEDEE2`): Secondary and body copy; reduced-emphasis text.

### Surface & Borders
- **Hairline** (`{colors.hairline}` — `#7B66FF`): 1px borders, dividers, and fine stroke accents on featured components.

## 3. Typography Rules

### Font Family

**Primary:** DM Sans (https://fonts.googleapis.com/)  
**Fallback stack:** `DM Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display | DM Sans | 48px | 400 | 1.17 | -0.24px | Hero headlines; largest text masses |
| Heading Large | DM Sans | 36px | 400 | 1.19 | 0px | Section titles; major divisions |
| Heading Medium | DM Sans | 32px | 400 | 1.25 | -0.16px | Subsection headers |
| Heading Small | DM Sans | 24px | 599 | 1.33 | -0.12px | Card titles, emphasis headers |
| Heading XS | DM Sans | 20px | 599 | 1.4 | -0.1px | Minor headings, labels |
| Body Large | DM Sans | 16px | 400 | 1.5 | 0px | Primary body text, descriptions |
| Body Medium | DM Sans | 14px | 400 | 1.43 | 0px | Secondary text, captions |
| Button Large | DM Sans | 18px | 400 | 1.44 | -0.09px | Large action buttons |
| Button Medium | DM Sans | 14px | 599 | 1.43 | 0px | Standard button text |
| Label | DM Sans | 14px | 400 | 1.71 | 0px | Form labels, input placeholders |
| Caption XS | DM Sans | 12px | 400 | 1.33 | 0px | Fine print, metadata |

### Principles

- **Negative tracking on display and large headings** (`-0.24px`, `-0.16px`, `-0.12px`) creates visual density and premium feel.
- **Moderate to loose line heights** (1.4–1.71) ensure readability in dark mode and support long-form content.
- **Weight variation** between 400–599 provides hierarchy without introducing new font families; bold headings anchor sections.
- **Consistent body text** at 16px with 1.5 line height establishes rhythm for scanning and comprehension.
- **Small caps and uppercase labels** leverage DM Sans's geometric simplicity for UI labels and badges.

## 4. Component Stylings

### Buttons

**Primary (Accent CTA)**
- Background: `{colors.accent}` (`#673DE6`)
- Text: `{colors.on-primary}` (`#FFFFFF`)
- Padding: `{spacing.md}` (`16px`) horizontal, `{spacing.sm}` (`12px`) vertical
- Font: `{typography.button-md}` (14px, weight 599)
- Border Radius: `{rounded.full}` (pill shape, 9999px)
- Border: None
- Box Shadow: `rgba(0, 0, 0, 0) 0px 0px 0px 1px` (subtle hairline in light mode)
- Height: 48px
- Width: 175px
- Hover: Opacity 1.0, background shifts to purple hover state
- Active: `transform: translateY(1px)` (subtle press effect)
- Focus: `outline: 2px solid {colors.hairline}` (`#7B66FF`)

**Secondary (Dark Button)**
- Background: `{colors.primary}` (`#222225`)
- Text: `{colors.on-primary}` (`#FFFFFF`)
- Padding: `{spacing.md}` (`16px`)
- Font: `{typography.button-md}` (14px, weight 599)
- Border Radius: `{rounded.sm}` (12px) or `{rounded.xs}` (8px) depending on variant
- Border: `1px solid rgba(255, 255, 255, 0.15)`
- Height: 48px or 66px (large variant)
- Hover: `background-color: var(--h-bg-neutral-hover)`, opacity 1.0
- Active: `transform: none`
- Disabled: Opacity 0.5

**Ghost / Text Button**
- Background: Transparent
- Text: `rgba(255, 255, 255, 0.9)` (16px, weight 600)
- Padding: `8px 16px`
- Border Radius: `{rounded.full}` (9999px)
- Border: None
- Hover: Background lightens to `rgba(255, 255, 255, 0.16)` or remains transparent with text color change
- Focus: `outline: 4px solid {colors.hairline}` with inset box-shadow

### Cards & Containers

**Featured Card (with Brand Border)**
- Background: `{colors.surface-alt}` (`#18181A`)
- Border: `2px solid {colors.hairline}` (`#7B66FF`)
- Border Radius: `{rounded.none}` to `{rounded.sm}` (0–12px depending on variant; most measure 24px)
- Padding: `{spacing.lg}` (`24px`) all sides
- Text Color: `{colors.on-primary}` (`#FFFFFF`) headings, `{colors.body}` (`#DEDEE2`) body
- Font: `{typography.body-lg}` (16px, weight 400)
- Hover: Border color brightens, optional subtle lift or rotation (some variants measure `rotate(-2deg) translateY(-1px)`)
- Box Shadow: None (color blocking only)
- Width: 328px
- Height: 475px (pricing card)

**Standard Card (No Border)**
- Background: `{colors.surface-alt}` (`#18181A`)
- Border: None
- Border Radius: `{rounded.none}` to `{rounded.sm}` (measured 24px in most cases)
- Padding: `{spacing.lg}` (`24px`)
- Text: Same as featured
- Hover: `background-color: var(--h-bg-neutral-hover)`, possible color shifts on nested text
- Box Shadow: None

### Inputs & Forms

**Text Input**
- Background: `{colors.surface}` (`#101011`)
- Border: `1px solid {colors.hairline}` (`#7B66FF`)
- Border Radius: `{rounded.sm}` (12px)
- Padding: `{spacing.sm}` (`12px`)
- Font: `{typography.label}` (14px, weight 400)
- Text Color: `{colors.on-primary}` (`#FFFFFF`)
- Placeholder: `{colors.body}` (`#DEDEE2`)
- Focus: `outline: 2px solid {colors.hairline}`
- Height: 48px

### Navigation

**Header Navigation**
- Background: `{colors.canvas}` (`#000000`)
- Height: 72px
- Padding: `0px` (full width)
- Box Shadow: `rgba(0, 0, 0, 0.1) 0px 4px 10px 0px`
- Border: None
- Link Color: `{colors.on-primary}` (`#FFFFFF`)
- Font: `{typography.body-lg}` (16px, weight 400)
- Link Hover: Opacity 0.8, underline may appear, color shifts to brand accent
- Link Focus: `outline: 4px solid {colors.hairline}` (`#7B66FF`)

**Mobile Menu Toggle**
- Appears below 1280px viewport width
- Style: Hamburger icon, typically in `{colors.on-primary}` (`#FFFFFF`)

### Badges

**Filled Badge (Featured Label)**
- Background: `{colors.accent}` (`#673DE6`)
- Text: `{colors.on-primary}` (`#FFFFFF`)
- Padding: `{spacing.xs}` (`8px`) horizontal, `{spacing.xxs}` (`4px`) vertical
- Font: `{typography.caption-xs-strong}` (12px, weight 599)
- Border Radius: `{rounded.xs}` (8px)
- Border: None
- Hover: Color may shift per custom state

**Tinted Badge (Accent Variant)**
- Background: `rgba(123, 102, 255, 0.25)` (translucent brand accent)
- Text: `#9D99FF` (light purple)
- Padding: `2px 8px`
- Font: `{typography.caption-xs-strong}` (12px, weight 599)
- Border Radius: `{rounded.xs}` (8px)

## 5. Layout Principles

### Spacing System

Base unit: `{spacing.xxs}` = 4px. All spacing derives from this 4px grid.

- `{spacing.xxs}` = 4px — Micro spacing (icon gaps, badge padding)
- `{spacing.xs}` = 8px — Tight spacing (form field gaps, list item padding)
- `{spacing.sm}` = 12px — Small spacing (button padding, component padding)
- `{spacing.md}` = 16px — Standard spacing (section gaps, card padding)
- `{spacing.lg}` = 24px — Generous spacing (card padding, section margins)
- `{spacing.xl}` = 32px — Large spacing (major section gaps)
- `{spacing.xxl}` = 40px — Extra-large spacing (hero spacing, top-level sections)

**Usage:** Body copy and cards use `{spacing.lg}` (`24px`) padding. Section gaps are `{spacing.xl}` (`32px`) to `{spacing.xxl}` (`40px`). Horizontal padding in mobile remains 0px (full-bleed); desktop adds symmetrical padding from the grid.

### Grid & Container

- **Max width:** 1360px (measured at 1440px viewport)
- **Content column:** Grows with viewport (343px at 375px → 1360px at 1440px)
- **Grid columns:** Responsive (1 at 375px, 3 at 768px–1024px, 6 at 1280px+)
- **Section padding:** No horizontal padding on mobile (full-bleed); relies on internal card/column padding
- **Container strategy:** Full-width sections with centered max-width wrapper for content; background colors extend edge-to-edge.

### Whitespace Philosophy

Space is used generously to establish hierarchy and reduce cognitive load. Hero sections employ `{spacing.xxl}` (`40px`) gaps between major elements. Cards maintain `{spacing.lg}` (`24px`) internal padding to separate content. Between sections, gaps of `{spacing.xl}` to `{spacing.xxl}` create clear visual breaks. The system favors **breathing room** over compact layouts, signaling premium positioning and supporting readability in dark mode.

### Border Radius Scale

- `{rounded.none}` = 0px — Cards, image backgrounds, overlays (sharp, technical aesthetic)
- `{rounded.xs}` = 8px — Badges, small components, input corners
- `{rounded.sm}` = 12px — Form inputs, secondary elements
- `{rounded.full}` = 9999px — Buttons, pill-shaped badges, avatars (interactive elements are uniformly pill-shaped)

**Pattern:** Interactive elements (buttons, toggles) use `{rounded.full}` for softness and approachability. Content containers (cards) remain sharp (`{rounded.none}` or subtle `{rounded.sm}`) to emphasize structure and data.

### Border Widths

- **thin** (1px) — Used on cards with subtle definition, and on link borders and input edges
- **medium** (2px) — Used on featured card borders (brand-accent borders), providing emphasis and visual weight

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Base (Flat) | No shadow, color only | Canvas background, standard cards, most UI |
| Subtle (sm) | `rgb(255, 255, 255) 0px 0px 0px 1px` | Card definition in light contexts, link borders |
| Micro (md) | `rgba(0, 0, 0, 0) 0px 0px 0px 1px` | Button outline, minimal lift |
| Lifted (lg) | `rgba(0, 0, 0, 0.1) 0px 4px 10px 0px` | Navigation header, floating elements |

**Shadow Philosophy:**  
Hostinger uses **color blocking as its primary depth mechanism**. Shadows are minimal and rarely employed; instead, surface color changes (`{colors.surface}`, `{colors.surface-alt}`) and strategic border usage (especially the `{colors.hairline}` purple border) create perceived depth. This approach aligns with the dark-mode aesthetic and maintains high contrast for readability. When shadows *are* used (navigation, lifted overlays), they employ subtle, near-black shadows (`rgba(0, 0, 0, 0.1)`) to avoid visual harshness.

### Opacity Levels

- **20% / 0.20** — Used for hover states, disabled states, and translucent overlays (e.g., `rgba(255, 255, 255, 0.15)` for subtle borders, `rgba(123, 102, 255, 0.25)` for tinted badge backgrounds)
- **Disabled state:** 0.5–0.6 opacity
- **Hover brightening:** Varies (0.7–0.8 opacity for darkening, 1.0 for emphasis)

### Z-index / Layering

- **base** = 1, 2 — Standard card and component layers
- **modal** = 1000, 1001, 9996, 9999 — Overlays, dialogs, modals (high stacking)
- **toast** = 999999 — Notifications and alerts (always topmost)

**Layering strategy:** The system reserves extremely high z-index values (9996, 9999, 999999) for transient UI (toasts, modals), ensuring they always float above all content. Standard content operates in the 1–2 range; dropdown menus and overlays occupy the 1000+ range.

## 7. Do's and Don'ts

### Do

- **Use the brand accent (`#673DE6`) sparingly** — Reserve it for primary CTAs, featured card borders, and key highlights. Overuse dilutes impact.
- **Leverage pill-shaped buttons** (`{rounded.full}`) for all interactive primary elements; they establish immediate affordance and consistency.
- **Maintain ample internal padding** on cards and sections (`{spacing.lg}` = 24px minimum) to support the breathing, premium aesthetic.
- **Pair negative letter-spacing on large headings** with tight line heights to achieve visual density and impact.
- **Use the hairline border color** (`#7B66FF`) on featured elements only; it commands attention and signals premium positioning.
- **Employ full-width color blocks** for section backgrounds; extend surface colors edge-to-edge for immersive dark-mode layouts.
- **Stack icons, text, and controls vertically** on mobile; the single-column grid (375px) requires vertical scrolling and clear hierarchy.
- **Ensure text contrast** — always pair light text (`#FFFFFF`, `#DEDEE2`) on dark backgrounds (`#000000`, `#101011`, `#18181A`).
- **Use the card default border style** (`2px solid #7B66FF`) only for featured or primary cards (e.g., recommended pricing tier); standard cards remain unbordered.

### Don't

- **Don't mix border radiuses on related components** — buttons are always pill (`9999px`), cards are always sharp (`0px`–`12px`). This contrast reinforces their semantic roles.
- **Don't introduce accent colors outside the defined palette** — `#673DE6` and `#7B66FF` are the only chromatic values; all else is neutral.
- **Don't add heavy shadows** — the system prioritizes flat color blocking. If depth is needed, use a color-shift (to `{colors.surface-alt}`) or a thin hairline border.
- **Don't use opacity for primary text** — body copy and headings should always be fully opaque (`{colors.on-primary}` = `#FFFFFF`, or `{colors.body}` = `#DEDEE2`). Reserve opacity for interactive state feedback and disabled states only.
- **Don't shrink typography below 12px** — `{typography.caption-xs}` (12px) is the floor for accessibility and readability in dark mode.
- **Don't collapse spacing at breakpoints unnecessarily** — maintain `{spacing.lg}` (24px) card padding even on mobile; responsive design should reduce *layout width*, not internal breathing room.
- **Don't overlay text directly on image backgrounds** — use a dark color block or semi-transparent scrim (`rgba(0, 0, 0, 0.5)`+) to ensure contrast.
- **Don't use underlines on links in body text unless explicitly hovering** — the system's neutral color palette requires explicit interaction states to signal link affordance.

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Grid Columns | Content Column | Nav Visible | Heading Size | Key Changes |
|---|---|---|---|---|---|---|
| Mobile | 375px | 1 | 343px | Limited (menu toggle) | 36px | Single-column layout; menu icon toggles nav; full-width cards |
| Tablet | 768px | 3 | 688px | Limited (menu toggle) | 36px | 3-column grid appears; padding increases; nav still collapsed |
| Laptop | 1024px | 3 | 944px | Limited (menu toggle) | 48px | Display heading scales to 48px; menu still toggled |
| Desktop | 1280px | 6 | 1200px | Visible (3+ links) | 48px | Full navigation bar visible; 6-column grid active; max-width container enforced |
| Large Desktop | 1440px | 6 | 1360px | Visible (3+ links) | 48px | Max width stabilizes; horizontal scrolling disabled |

### Touch Targets

- **Minimum touch target size:** 48px × 48px (buttons, form inputs, navigation links)
- **Spacing between targets:** `{spacing.sm}` (12px) minimum to prevent accidental taps
- **Button heights:** 40px (compact), 48px (standard), 66px (large/hero)
- **Form inputs:** 48px height ensures comfortable mobile interaction

### Collapsing Strategy

- **Mobile (375px–767px):** Single-column layout; all cards and sections stack vertically. Navigation collapses into a hamburger menu. Heading size remains 36px for visual hierarchy. Padding within cards stays at `{spacing.lg}` (24px); no reduction.
- **Tablet (768px–1023px):** 3-column grid activates. Navigation remains toggled (menu icon visible). Content column expands to 688px. Heading size holds at 36px.
- **Desktop (1024px+):** Navigation bar expands to show 3+ primary links. 6-column grid system enables flexible multi-card layouts. At 1280px, heading jumps to 48px. Content column locks at 1200px–1360px.
- **Grid changes:** Pricing cards, feature cards, and testimonials reflow from 1 column → 3 columns → 6 columns as viewport expands. Max-width container prevents content from stretching beyond 1360px.
- **Section padding:** Horizontal padding remains 0px on mobile (full-bleed); tablet/desktop add padding via the max-width wrapper, not direct section padding.

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Accent (`#673DE6`) — Use for main buttons, featured borders, key highlights
- **Secondary CTA:** Primary Dark (`#222225`) — Use for secondary buttons, inactive states
- **Background:** Canvas (`#000000`) — Default page background
- **Card Surface:** Surface Alt (`#18181A`) — Primary card and container background
- **Text (Primary):** On Primary (`#FFFFFF`) — All headings and high-emphasis copy
- **Text (Secondary):** Body (`#DEDEE2`) — Body copy, secondary information
- **Borders & Accents:** Hairline (`#7B66FF`) — Featured card borders, dividers, fine strokes
- **Interactive hover:** Accent shifts to purple hover; opacity may reduce to 0.7–0.8 on non-brand elements

### Iteration Guide

1. **All interactive buttons use pill-shaped radius** (`border-radius: 9999px`). Apply this consistently across primary, secondary, and ghost variants.
2. **Primary CTAs are always brand accent** (`#673DE6`) on transparent or dark backgrounds. Secondary CTAs use dark gray (`#222225`).
3. **Cards maintain large internal padding** (`padding: 24px`) and stay sharp-cornered (`border-radius: 0px` or `12px` max). Only featured pricing cards get the purple hairline border (`2px solid #7B66FF`).
4. **Typography hierarchy drives visual weight.** Use `{typography.display}` (48px, weight 400, -0.24px tracking) for hero headlines. Drop to `{typography.heading-md}` (32px) for section titles.
5. **Spacing is grid-based on 4px units.** Section gaps are `24px` to `40px`. Card padding is always `24px` minimum. Button padding is `12px` vertical × `16px` horizontal.
6. **Dark mode is the default; all surfaces are black, charcoal, or deep gray.** Text is always white (`#FFFFFF`) or light gray (`#DEDEE2`). Ensure WCAG AAA contrast (7:1+).
7. **Depth comes from color blocking and thin borders, not shadows.** Reserve shadows only for floating UI (navigation, modals). Most components are flat.
8. **Mobile layout is single-column up to 768px.** Navigation collapses into a toggle. Hero headings remain 36px. Expand to 3–6 columns only after 768px breakpoint.
9. **Opacity signals interaction state.** Hover states use 0.7–0.8 opacity or background color shifts. Disabled states lock at 0.5–0.6 opacity.
10. **Negative letter-spacing on large text** (`-0.24px`, `-0.16px`) is a defining brand trait. Apply it to all `{typography.display}`, `{typography.heading-md}`, and `{typography.heading-sm}` roles.

## 10. Known Gaps

- **Interaction states for links** — The extraction captured hover states (underline, color shifts) but did not isolate focus, visited, or active states for all link types. Implementation should follow WCAG focus-visible standards and ensure 2px outline on `:focus-visible`.
- **Error, success, and warning semantic colors** — The site does not declare explicit status colors in its markup. No red, green, or yellow status palette was measured. If form validation or alert states are needed, these should be defined separately and added to the system.
- **Gradient backgrounds or decorative meshes** — No gradients or overlaid patterns were detected. All backgrounds are solid colors. If gradients are introduced later, they should maintain dark-mode legibility and contrast.
- **Dark/light mode variants** — Only the dark theme was measured and is in scope. A light-mode inversion or alternative theme was not analyzed and should be considered a separate expansion.
- **Animation/transition timings** — No explicit animation durations, easing functions, or keyframe definitions were extracted. The system captures static styles; motion design should be documented separately.
- **Hover/active/focus state exhaustively** — Some interactive roles (badges, custom toggles, specific card states) may have hover or focus states not fully captured in this extraction. Implement standard focus-visible outlines (`2px solid #7B66FF`) and test all interactive elements.
- **Surfaces behind authentication** — Only public pages were analyzed. Dashboard, user account, or admin panels may have different component styles not reflected here.
- **Extended component library** — Only buttons, cards, inputs, navigation, badges, and links were measured. Additional components (modals, tooltips, dropdowns, sliders, tabs) may exist on other pages and should be documented separately.
- **Accessibility attributes** — The extraction did not measure ARIA labels, roles, or landmark structure. Ensure all components follow semantic HTML and WCAG 2.1 level AA+ standards.
- **SVG and icon system** — Icon styles, sizes, and color mappings were not extracted. Icon documentation should be added separately with sizes (12px, 16px, 24px, 32px) and color roles.