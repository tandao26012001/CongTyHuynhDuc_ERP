---
name: Industrial Procurement & Shop-Floor Engine
colors:
  surface: '#faf8ff'
  surface-dim: '#d1d9f6'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#d9e2fe'
  on-surface: '#121b30'
  on-surface-variant: '#454652'
  inverse-surface: '#273046'
  inverse-on-surface: '#edf0ff'
  outline: '#757683'
  outline-variant: '#c5c5d4'
  surface-tint: '#4556b4'
  primary: '#092081'
  on-primary: '#ffffff'
  primary-container: '#283a97'
  on-primary-container: '#9eacff'
  inverse-primary: '#bac3ff'
  secondary: '#4557b2'
  on-secondary: '#ffffff'
  secondary-container: '#8b9dfe'
  on-secondary-container: '#1b2f8b'
  tertiary: '#630009'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d0011'
  on-tertiary-container: '#ff928b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105b'
  on-primary-fixed-variant: '#2c3d9a'
  secondary-fixed: '#dee1ff'
  secondary-fixed-dim: '#bac3ff'
  on-secondary-fixed: '#001159'
  on-secondary-fixed-variant: '#2b3e99'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#faf8ff'
  on-background: '#121b30'
  surface-variant: '#d9e2fe'
  blue-dark: '#1E2C75'
  blue-tint: '#C6CCE9'
  blue-subtle: '#EEF0F9'
  red-dark: '#C4141F'
  red-tint: '#F9B9BE'
  red-subtle: '#FDECEE'
  paper: '#F4F6FA'
  rule: '#DCE1EC'
  rule-soft: '#EDF0F6'
  ink: '#0E1220'
  ink-secondary: '#59627A'
  ink-muted: '#8A93AA'
  pure-black: '#000000'
  pure-white: '#FFFFFF'
typography:
  headline-lg:
    fontFamily: Roboto
    fontSize: 23px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Roboto
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Roboto
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
  headline-sm:
    fontFamily: Roboto
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 22px
  body-md:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Roboto
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Roboto Condensed
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-eyebrow:
    fontFamily: Roboto Condensed
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.07em
  data-table-header:
    fontFamily: Roboto Condensed
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  data-table-cell:
    fontFamily: Roboto Condensed
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-tabular-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  shopfloor-touch-primary:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

### Personality & Purpose
The design system delivers an uncompromising, utilitarian, and mission-critical operating experience for industrial manufacturing, warehouse operations, and enterprise procurement. Built for environments where operational delays cause assembly line shutdowns and human error carries high financial risk, the interface rejects decorative indulgence in favor of absolute visual hierarchy, legibility under harsh shop-floor lighting, and high-density data parsing.

### Design Movement
The visual language operates at the intersection of **Industrial Functionalism** and **Modern Corporate Ergonomics**:
- **Rigid Data Structure**: High-density layouts, clear visual grids, explicit borders, and tabular clarity replace ambient whitespace waste.
- **Bi-Chromatic Semantic Discipline**: A hyper-disciplined dual-chromatic model (Deep Industrial Blue for systematic navigation, actions, and structure; Precision Crimson for operational danger, errors, and critical stoppages).
- **Physical Shop-Floor Ergonomics**: Interfaces dynamically scale between desktop inventory analysis and rugged shop-floor tablets/phones (`.o-xuong`), guaranteeing minimum 44px to 48px hit targets, barcode scanning immediacy, and rapid visual confirmation.

## Colors

### Color Philosophy & Strict Economy
Color is strictly functional, never decorative. The palette enforces a rigorous two-pole semantic model:
- **Blue Axis (`#283A97` / `#4A5CB8`)**: Governs structural navigation, primary commands, focus triggers, confirmed operational steps, and informational status.
- **Red Axis (`#EE202E` / `#C4141F`)**: Reserved exclusively for critical alarms, stock shortages, delivery delays, destructive triggers, and structural validation failures.

### Canvas & Neutral Grounding
The backdrop uses `--paper` (`#F4F6FA`) to mitigate eye fatigue caused by raw white backdrops under fluorescent plant lighting. Solid surface containers (`#FFFFFF`) rise above the canvas bounded by `--rule` (`#DCE1EC`). Typography establishes high contrast against both surfaces through deep slate ink (`#0E1220`) for primary legibility and secondary charcoal (`#59627A`) for supplementary metadata.

## Typography

### Tri-Font Architecture
This design system implements a tripartite typographic hierarchy designed for speed of scanning and structural alignment:
1. **Primary Interface Font (`Roboto`)**: Applied to all standard body paragraphs, dialog copy, form input entry, primary navigation links, and standard buttons.
2. **Dense Data & Meta Font (`Roboto Condensed`)**: Applied to table column headers, form field labels, metadata eyebrows, metric badges, and status pills. The condensed horizontal footprint provides an 8–12% gain in data density per line without sacrificing legibility. All condensed labels adopt uppercase styling with positive letter-spacing (`0.05em` to `0.07em`).
3. **Tabular & Mathematical Engine (`JetBrains Mono` / `Roboto Mono`)**: Applied to all document identifiers, PO/PR reference codes, item serials, batch timestamps, currency tallies, and numerical units. Tabular figures ensure strict vertical column alignment.

### Operational Shop-Floor Scaling
When running in high-friction plant environments (`.o-xuong`), base typography enforces a minimum text size of 16px to maintain high legibility from arms-length viewing distances.

## Layout & Spacing

### Layout Structure
- **Fixed Navigation Rail**: Width is locked to `250px`. Contains the primary operational modules, warehouse divisions, and procurement routes. Collapses into an off-canvas drawer triggered by `☰` below the `860px` viewport threshold.
- **Top Bar**: Fixed height of `58px`, sticky at the viewport crown. Contains plant location switchers, search/scan triggers (`🔍`), notifications (`🔔`), and session credentials.
- **Main Canvas**: Fluid grid running across `--paper` (`#F4F6FA`). Outer margins are `24px` on desktop systems and adjust down to `12px` (`0.75rem`) on viewports under `640px`.

### 4px/8px Baseline Spacing Units
- `space-xs` (4px): Micro gaps between status badge icons and text, dense data table cell paddings.
- `space-sm` (8px): Button icon-to-label separation, compact form field groupings, toolbar gaps.
- `space-md` (16px): Standard card interior padding, grid column gutters, input horizontal offsets.
- `space-lg` (24px): Structural card separation, panel divider spacing, major section boundaries.
- `space-xl` (32px): Deep page segmentation and metric dashboard cluster separation.

## Elevation & Depth

### Structural Outlines Over Heavy Shadows
Visual depth adheres strictly to **Tonal Layering with High-Precision Outlines**. Interfaces rely primarily on 1px borders (`#DCE1EC`) and contrasting background planes rather than heavy drop-shadows, ensuring UI elements maintain sharp edge contrast on low-grade industrial monitor panels:

1. **Surface 0 (Canvas)**: `--paper` (`#F4F6FA`), zero elevation, base plane.
2. **Surface 1 (Card & Rail Containers)**: `#FFFFFF`, bounded by `1px solid var(--rule)`, subtle grounding ambient shadow: `0 1px 2px rgba(14, 18, 32, 0.06)`.
3. **Surface 2 (Floating Popovers & Combobox Dropdowns)**: `#FFFFFF`, bounded by `1px solid var(--rule)`, directional shadow: `0 3px 10px -2px rgba(14, 18, 32, 0.12)`.
4. **Surface 3 (Operational Modals & Critical Drawers)**: `#FFFFFF`, surrounded by a high-diffusion focus shadow: `0 16px 40px -10px rgba(14, 18, 32, 0.28)`, sitting atop a translucent ink veil backdrop (`rgba(14, 18, 32, 0.45)`).

## Shapes

### Controlled Soft Radius
To reflect industrial machinery and rugged digital tools, the system maintains a clean, low-radii silhouette:
- **Base Components (`roundedness: 1` / `5px`)**: Applied consistently to primary and secondary buttons, input boxes, dropdown selectors, and data cards. It retains structured geometry without harsh unsoftened corners.
- **Panel & Modal Containers (`9px`)**: Structural modal dialogues and prominent metric summary containers use a slightly elevated 9px corner radius.
- **Capsule Rounding (Pill / Full Round)**: Exclusively restricted to status badges (`.pill`), employee identifier chips, and urgent delay notices (`.cb-tre`) to visually distinguish classification labels from clickable rectangular controls.

## Components

### Buttons
- **Primary Action (`.btn-primary`)**: Background `--blue` (`#283A97`), text `#FFFFFF`, radius `5px`, height `36px` (desktop) / `48px` (shop floor). Active state shifts to `--blue-dark` (`#1E2C75`). Focus ring: `2px solid var(--blue-4)`.
- **Secondary Action (`.btn-secondary`)**: Surface `#FFFFFF`, border `1px solid var(--rule)`, text `--ink` (`#0E1220`). Hover background `--blue-subtle` (`#EEF0F9`).
- **Destructive / Stop Action (`.btn-danger`)**: Background `--red` (`#EE202E`), text `#FFFFFF`. Hover background `--red-dark` (`#C4141F`).

### Status Pills (`.pill`)
Pills use `Roboto Condensed` 11.5px bold uppercase text with 100px capsule radius, padding `2px 8px`:
- **Normal / Accepted (`.p-ok`, `.p-b`)**: Text `--blue` (`#283A97`), background `--blue-subtle` (`#EEF0F9`).
- **Completed / Closed (`.p-k`)**: Text `#FFFFFF`, background `--pure-black` (`#000000`).
- **Attention Required (`.p-warn`, `.p-ro`)**: Text `--red` (`#EE202E`), background `#FFFFFF`, border `1px solid var(--red)`.
- **Critical / Rejected / Overdue (`.p-r`)**: Text `#FFFFFF`, background `--red` (`#EE202E`).
- **Neutral / Draft (`.p-info`)**: Text `--ink-secondary` (`#59627A`), background `#EDF0F6`.

### Data Tables
- **Headers (`th`)**: Background `#F4F6FA`, border-bottom `1px solid var(--rule)`, typography `Roboto Condensed` 11px uppercase bold, text `--ink-secondary`.
- **Rows (`tr`)**: Background `#FFFFFF`, border-bottom `1px solid var(--rule-soft)`. Hover background `--blue-subtle`.
- **Operational Alarm Marker (`.dong-canh-bao`)**: Rows flagged with critical status feature a `3px solid var(--red)` left-side border accent.

### Form Inputs & Fields
- **Label**: Positioned above input, `Roboto Condensed` 12px bold uppercase, text `--ink-secondary` (`#59627A`).
- **Field Box**: Height `36px` (Desktop) / `44px` (Shop Floor), background `#FFFFFF`, border `1px solid var(--rule)`, text `--ink`.
- **Focus State**: Border color `--blue-4` (`#4A5CB8`), subtle shadow `0 0 0 2px var(--blue-tint)`.
- **Validation Error**: Border color `--red` (`#EE202E`), error message in `Roboto` 12px `--red`.

### Cards & Industrial Panels
- Background `#FFFFFF`, border `1px solid var(--rule)`, corner radius `5px`.
- Card headers feature an explicit 1px divider separating title blocks from data rows, maintaining clean visual compartments across inventory views.