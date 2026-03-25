# Design System — AI Workbench

## Product Context
- **What this is:** Internal AI application workbench portal for team collaboration
- **Who it's for:** Internal team members (operators, designers, AI engineers) + administrators
- **Space/industry:** Enterprise internal tools / AI services platform
- **Project type:** Web App (SaaS Dashboard)

## Design Philosophy

Based on **Apple Human Interface Guidelines**:
1. **Clarity** — Text is legible at every size, icons are precise and lucid, adornments are subtle
2. **Deference** — Content is king; UI never competes with content
3. **Depth** — Distinct visual layers and realistic motion impart vitality

---

## Aesthetic Direction

### Light Mode (Primary)
- **Background**: Pure white (#FFFFFF) with subtle gray surfaces
- **Surface elevation**: 3 levels only (background → card → elevated)
- **Shadows**: Soft, diffused, multi-directional (Apple Maps style)
- **Borders**: Hairline thin, very subtle (#E5E5E5)

### Dark Mode
- **Background**: True black (#000000) or near-black (#0A0A0A)
- **Surface elevation**: Uses brightness, not overlay opacity
- **Shadows**: Minimal, only on floating elements
- **Borders**: Slightly brighter than background (#1C1C1E)

### Visual Style
- Clean, light, airy
- Generous whitespace
- System-native appearance
- No gradients on backgrounds
- No decorative elements
- Typography-driven hierarchy

---

## Typography

### Font Stack
```css
--font-sans: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
```

### Type Scale (Apple-inspired)
| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Large Title | 34px | 700 | 1.2 | -0.02em |
| Title 1 | 28px | 700 | 1.2 | -0.01em |
| Title 2 | 22px | 700 | 1.25 | 0 |
| Title 3 | 20px | 600 | 1.3 | 0 |
| Headline | 17px | 600 | 1.35 | 0 |
| Body | 17px | 400 | 1.5 | 0 |
| Callout | 16px | 400 | 1.4 | 0 |
| Subhead | 15px | 400 | 1.35 | 0 |
| Footnote | 13px | 400 | 1.3 | 0 |
| Caption 1 | 12px | 400 | 1.3 | 0 |
| Caption 2 | 11px | 400 | 1.2 | 0 |

### Semantic Usage
- **Page titles**: Title 1, semibold
- **Section headers**: Headline, semibold
- **Body text**: Body, regular
- **Labels**: Footnote, medium
- **Status text**: Caption 1, medium
- **Code/IDs**: SF Mono, 14px

---

## Color

### Palette

#### Neutral (Gray)
| Token | Light | Dark |
|-------|-------|------|
| Gray 1 (Background) | #FFFFFF | #000000 |
| Gray 2 (Surface) | #F5F5F7 | #1C1C1E |
| Gray 3 (Elevated) | #FFFFFF | #2C2C2E |
| Gray 4 (Tertiary BG) | #F5F5F7 | #3A3A3C |
| Gray 5 (Separator) | #E5E5EA | #3A3A3C |
| Gray 6 (Border) | #D1D1D6 | #48484A |
| Gray 7 | #C7C7CC | #636366 |
| Gray 8 | #AEAEB2 | #8E8E93 |
| Gray 9 | #8E8E93 | #636366 |
| Gray 10 | #636366 | #48484A |
| Gray 11 | #3A3A3C | #3A3A3C |
| Label (Primary) | #000000 | #FFFFFF |
| Label (Secondary) | #3A3A3C | #EBEBF5 (0.6) |
| Label (Tertiary) | #3A3A3C (0.6) | #EBEBF5 (0.3) |
| Label (Quaternary) | #3A3A3C (0.3) | #EBEBF5 (0.18) |

#### Accent (Blue)
Used sparingly for interactive elements only.
| Token | Light | Dark |
|-------|-------|------|
| Accent | #007AFF | #0A84FF |
| Accent Hover | #0071E3 | #409CFF |
| Accent Pressed | #0056B3 | #0056B3 |

#### Semantic
| State | Light | Dark |
|-------|-------|------|
| Success | #34C759 | #30D158 |
| Warning | #FF9500 | #FF9F0A |
| Error | #FF3B30 | #FF453A |
| Info | #5AC8FA | #64D2FF |

### Background System
- **Primary Background**: Pure white (light) / Pure black (dark)
- **Secondary Background**: #F5F5F7 (light) / #1C1C1E (dark)
- **Grouped Background**: Used for sidebar, table headers
- **Elevated Card**: White with soft shadow (light) / #2C2C2E (dark)

### Dark Mode Strategy
- Use pure black (#000000) as base for OLED
- Elevated surfaces use slightly lighter values
- No gray overlays with opacity — use brightness shifts
- Borders: #3A3A3C (barely visible separator)

---

## Spacing

### Base Unit
**4px** — Apple uses 4pt grid

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| 0 | 0 | Reset |
| 1 | 4px | Tight gaps |
| 2 | 8px | Icon-to-text, compact padding |
| 3 | 12px | Small padding |
| 4 | 16px | Standard padding |
| 5 | 20px | Medium padding |
| 6 | 24px | Section padding |
| 8 | 32px | Large section gaps |
| 10 | 40px | Page margins |
| 12 | 48px | XL spacing |
| 16 | 64px | XXL spacing |

### Layout Spacing
- **Page margins**: 24px (mobile), 48px (tablet), 64px (desktop)
- **Card padding**: 20px (compact), 24px (standard)
- **Section gaps**: 24px
- **Component gaps**: 12px

---

## Layout

### Grid System
- **Columns**: 12-column fluid grid
- **Gutter**: 24px
- **Max content width**: 1200px
- **Sidebar width**: 280px (desktop), full-screen overlay (mobile)

### Border Radius
| Element | Radius |
|---------|--------|
| Buttons, Inputs | 10px (iOS standard) |
| Cards | 12px |
| Modals | 14px |
| Small elements | 8px |
| Pills/Tags | 9999px |

### Elevation (Shadows)
Apple uses **layered shadows**, not dramatic drops:

```css
/* Level 1: Cards at rest */
--shadow-1: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);

/* Level 2: Floating elements */
--shadow-2: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);

/* Level 3: Modals, dropdowns */
--shadow-3: 0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);

/* Level 4: Critical dialogs */
--shadow-4: 0 24px 60px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08);
```

---

## Motion

### Philosophy
Motion should feel **natural and responsive**, not decorative. It communicates state changes and provides feedback.

### Timing Functions
```css
--ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);     /* Apple standard */
--ease-in: cubic-bezier(0.4, 0, 1, 1);                   /* Accelerate out */
--ease-out: cubic-bezier(0, 0, 0.2, 1);                  /* Decelerate in */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);        /* Subtle bounce */
```

### Durations
| Token | Duration | Usage |
|-------|----------|-------|
| Instant | 0ms | Immediate feedback |
| Fast | 100ms | Hover states, small transitions |
| Normal | 200ms | Most transitions |
| Slow | 300ms | Page transitions, modals |
| Delayed | 400ms+ | Staggered animations |

### Motion Principles
1. **Purposeful** — Every animation communicates something
2. **Quick** — Never block interaction > 300ms
3. **Natural** — Use physics-based easing
4. **Respectful** — Honor `prefers-reduced-motion`

### Key Animations
- **Page entrance**: Fade in + slide up 8px, 300ms ease-out
- **Card hover**: Subtle shadow increase, 150ms
- **Button press**: Scale to 0.97, 100ms
- **Sidebar collapse**: Width change, 250ms ease-out
- **Modal**: Fade + scale from 0.95, 200ms

---

## Components

### Button

#### Primary
- Background: Accent (#007AFF)
- Text: White, 17px semibold
- Padding: 12px 24px
- Corner radius: 10px
- Pressed: Scale 0.97, darker background
- Disabled: Opacity 0.4

#### Secondary
- Background: #F5F5F7 (light) / #2C2C2E (dark)
- Text: Accent color
- Same dimensions as primary

#### Tertiary/Ghost
- Background: Transparent
- Text: Accent color
- No border

### Card
- Background: White (light) / #1C1C1E (dark)
- Border: 1px solid #E5E5EA (light) / none (dark)
- Corner radius: 12px
- Padding: 20px
- Shadow: --shadow-1

### Input
- Background: #F5F5F7 (light) / #2C2C2E (dark)
- Border: 2px solid transparent (rest) → Accent (focus)
- Corner radius: 10px
- Padding: 12px 16px
- Text: 17px
- Placeholder: Secondary label color

### Table
- Background: Transparent
- Row height: 44px (touch-friendly)
- Header: Footnote, secondary color, uppercase
- Separator: 1px Gray 5, full width
- Row hover: #F5F5F7 (light) / #2C2C2E (dark)

### Badge/Tag
- Background: Semantic color at 15% opacity
- Text: Semantic color
- Padding: 4px 10px
- Corner radius: 9999px (pill)
- Font: Caption 1 medium

### Navigation
- Sidebar background: Gray 2
- Active item: Accent background at 10%, accent text
- Hover item: Gray 4 background
- Separator: Gray 5

---

## iOS-Specific Considerations

### Safe Areas
- Respect `env(safe-area-inset-*)`
- Content never extends under notch/Dynamic Island
- Bottom sheet handles home indicator area

### Touch Targets
- Minimum 44x44pt for all interactive elements
- Adequate spacing between targets (8pt minimum)

### Scroll Behavior
- Native momentum scrolling
- Pull-to-refresh where appropriate
- Smooth scroll-to-top on tab tap

---

## Dark Mode Implementation

### Strategy
1. Use CSS custom properties for all colors
2. `@media (prefers-color-scheme: dark)` for system preference
3. Optional: Manual toggle for user override

### Key Differences
| Element | Light | Dark |
|---------|-------|------|
| Page BG | #FFFFFF | #000000 |
| Card BG | #FFFFFF | #1C1C1E |
| Input BG | #F5F5F7 | #2C2C2E |
| Text | #000000 | #FFFFFF |
| Secondary Text | #3A3A3C 60% | #EBEBF5 60% |
| Borders | #E5E5EA | #3A3A3C |
| Shadows | Soft multi-layer | Minimal, subtle |

---

## Accessibility

### Color Contrast
- Primary text: 4.5:1 minimum
- Secondary text: 3:1 minimum
- Interactive elements: 3:1 minimum for boundaries

### Focus States
- Clear focus ring: 3px offset, Accent color
- Visible on both light and dark backgrounds
- Never remove focus indicators

### VoiceOver/TalkBack
- Meaningful labels on all interactive elements
- Logical reading order
- Announce state changes

### Motion
- Always respect `prefers-reduced-motion`
- Provide alternative for complex animations

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Apple HIG-based design system | Clean, professional, content-first aesthetic matches internal tool needs |
| 2026-03-20 | SF Pro + system font stack | Native Apple feel with cross-platform fallbacks |
| 2026-03-20 | Single accent color (blue) | Apple restraint: color as signal, not decoration |
| 2026-03-20 | Pure black dark mode | OLED optimization, Apple aesthetic |
| 2026-03-20 | 4px base spacing unit | Matches Apple's 4pt grid system |
