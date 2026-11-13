---
name: SplitMint
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  stat-numeric:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
The design system pairs casual social dining and shared travel with precise, stress-free financial settling. Group expense splitting often introduces social friction and anxiety around money; the visual direction balances optimistic warmth with unmistakable ledger clarity. 

The aesthetic is Modern Fintech Warmth: crisp structured cards, high-contrast numeric data displays, soft pill badges, and tactile tactile micro-surfaces. The interface evokes feelings of mutual transparency, fairness, and swift resolution. Generous whitespace, crisp typographic hierarchy, and friendly rounded radii make rapid calculation, currency conversion, and receipt itemization feel effortless and approachable.

## Colors
The palette is anchored by a high-vitality emerald primary paired with rich slate neutrals.

- **Primary (`#10B981`) & Deep Emerald (`#059669`)**: Used for positive cash flow, settled balances, primary action buttons, and confirmation states. It provides an immediate visual cue that debts are covered and transactions are clear.
- **Slate Neutrals (`#0F172A`, `#1E293B`, `#64748B`, `#F8FAFC`)**: The deep navy-slate shades anchor numbers, primary headers, and high-emphasis labels. Pure off-white `#F8FAFC` serves as the canvas substrate, with pure `#FFFFFF` reserved for cards and modular panels to provide crisp natural contrast.
- **Category & Semantic Accents**:
  - **Warm Amber (`#F59E0B`)**: Used for dining, nightlife, and pending ledger items awaiting split approval.
  - **Indigo (`#6366F1`)**: Assigned to transit, airfares, and accommodations.
  - **Rose (`#F43F5E`)**: Reserved strictly for owed amounts, negative personal balances, and alert states.

## Typography
Plus Jakarta Sans delivers structural cheerfulness in headlines and ledger summaries through its soft geometric terminals and balanced curves. Inter provides uncompromised legibility for tabular numbers, transaction lists, user tags, and split breakdowns.

For financial totals, always set tabular numerals (`tnum`) in CSS font-variant settings to prevent jitter during real-time balance calculations. Use `stat-numeric` specifically for balance overviews ("You are owed $142.50"). Uppercase styling is limited strictly to `label-sm` for category indicators and metadata tags.

## Layout & Spacing
The layout model prioritizes mobile ergonomics. Single-column card stacks dominate handheld viewport widths, using a strict 4px/8px incremental rhythm for internal alignment.

- **Mobile Viewports (<640px)**: 16px (`margin`) outer edge boundaries. Interactive elements, avatar groupings, and split-slider rows align along a fluid container with 16px gutter spacing.
- **Tablet & Desktop Form Factors (≥640px)**: The view limits max reading widths to 680px for expense streams and receipt splitters, or reflows into a 2-column layout (Summary Ledger Left, Transaction History Right) with a 24px column gutter.
- **Component Breathing Room**: Dense data rows (line-item receipt items) employ `space-sm` vertical padding, while top-level debt balances use `space-lg` padding to command instant visual priority.

## Elevation & Depth
Depth is created through layered soft planes and tinted ambient occlusion rather than heavy drop shadows.

- **Level 0 (Base Canvas)**: Solid `#F8FAFC`. Zero elevation.
- **Level 1 (Card & Module Layer)**: Pure `#FFFFFF` resting over base canvas. Border: 1px solid `#E2E8F0`. Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Active/Selected Cards & Sliders)**: `#FFFFFF`. Border: 1px solid `#CBD5E1`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.06)`.
- **Level 3 (Modals, Bottom Sheets & Split Selectors)**: `#FFFFFF`. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.
- **Primary Action Elevation**: The primary emerald action button carries an ambient green glow: `0 4px 14px 0 rgba(16, 185, 129, 0.35)`.

## Shapes
Roundedness level 2 establishes an approachable yet engineered look. 

- Standard containers, list cards, form controls, and dialogs inherit `0.5rem` (8px) border radius.
- Larger group trip hero banners and overview cards scale to `1rem` (16px, `rounded-lg`).
- Modal sheets use `1.5rem` (24px, `rounded-xl`) on top edges.
- Status badges, participant avatars, action chips, and category tags break out of the scale to use full pill rounding (`9999px`) to distinguish categorical metadata from primary content cards.

## Components

### Buttons
- **Primary**: Background `#10B981`, text `#FFFFFF`, font `label-lg`. Height 48px on mobile for confident tap ergonomics. Slight tinted ambient shadow. Hover/Active state shifts to `#059669`.
- **Secondary / Ghost**: Background `#F1F5F9`, text `#0F172A`, 0 border, hover background `#E2E8F0`.
- **Destructive / Settle Up Alert**: Background `#FFF1F2`, text `#E11D48`, border 1px solid `#FECDD3`.

### Cards & Balance Summaries
- **Summary Cards**: Elevated white surface containing large `display-lg-mobile` balance values. Positive net balance uses `#059669`; owing balance uses `#E11D48`.
- **Expense Row Card**: Horizontal flex layout. Left side houses the circular category icon (40x40px, rounded-full with tinted background matching category color). Center houses the title and participant subtext. Right side stacks the net cost and user’s individual split share.

### Badges & Category Chips
- Pill-shaped (`rounded-full`), vertical padding 4px, horizontal padding 10px. 
- Category tints utilize an 85% light fill paired with a deep saturated text counterpart (e.g., Dining: `#FEF3C7` background with `#B45309` text).

### Form Inputs & Split Adjusters
- Inputs have a 48px fixed height, `#FFFFFF` fill, 1px `#CBD5E1` border, and radius of 8px. Focus shifts border to `#10B981` with a 3px ring of `rgba(16, 185, 129, 0.15)`.
- **Split Sliders / Steppers**: Contained within an inset `#F8FAFC` track with a 24px circular white thumb casting a Level 2 shadow.

### Settling-up Graph & Flow Connectors
- Step-by-step transaction routing uses dotted directional links (`#94A3B8`) connecting user avatar pills, displaying the exact arrow direction of payment flow (`Alice` → `$24.50` → `Bob`) to make complex debt simplification understandable at a glance.