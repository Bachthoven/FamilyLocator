---
name: familylocator-design-system
description: FamilyLocator app design system with color palettes, spacing rules, typography, component patterns, and button styles. Use when building new screens, components, dialogs, or UI elements to ensure visual consistency across the app.
---

# FamilyLocator Design System

## Color Palette

### Theme Colors (from `mobile/theme/colors.ts`)

| Token             | Light     | Dark      |
| ----------------- | --------- | --------- |
| background        | `#F9FAFB` | `#111827` |
| surface           | `#FFFFFF` | `#1F2937` |
| surfaceSecondary  | `#F3F4F6` | `#374151` |
| text              | `#1F2937` | `#F9FAFB` |
| textSecondary     | `#6B7280` | `#D1D5DB` |
| textMuted         | `#9CA3AF` | `#9CA3AF` |
| border            | `#E5E7EB` | `#374151` |
| primary           | `#0EA5E9` | `#0EA5E9` |
| primaryForeground | `#FFFFFF` | `#FFFFFF` |

### Semantic Colors

| Purpose                   | Color     |
| ------------------------- | --------- |
| Primary / Theme Blue      | `#0EA5E9` |
| Success / Active          | `#10B981` |
| Warning / Recent          | `#F59E0B` |
| Caution / Inactive        | `#F97316` |
| Danger / Offline / Delete | `#EF4444` |
| Destructive (iOS-style)   | `#FF3B30` |
| Info / Purple accent      | `#6366F1` |

### Status Colors (Member Activity)

| Status   | Color     | Condition            |
| -------- | --------- | -------------------- |
| Active   | `#10B981` | Currently active     |
| Recent   | `#F59E0B` | Less than 15 min ago |
| Inactive | `#F97316` | 15–60 min ago        |
| Offline  | `#EF4444` | Over 1 hour ago      |

### Place Category Colors

| Category | Color     |
| -------- | --------- |
| Home     | `#3B82F6` |
| Work     | `#10B981` |
| School   | `#8B5CF6` |
| Other    | `#F97316` |

### Dialog Colors

| Token               | Light     | Dark      |
| ------------------- | --------- | --------- |
| dialogBackground    | `#FFFFFF` | `#1F2937` |
| dialogBorder        | `#F3F4F6` | `#2D3748` |
| dialogText          | `#1F2937` | `#F9FAFB` |
| dialogTextSecondary | `#6B7280` | `#D1D5DB` |
| dialogTextMuted     | `#9CA3AF` | `#9CA3AF` |

### Tab Bar / Header

| Token            | Light     | Dark      |
| ---------------- | --------- | --------- |
| tabBarBackground | `#FFFFFF` | `#1F2937` |
| tabBarBorder     | `#F3F4F6` | `#2D3748` |
| tabBarInactive   | `#6B7280` | `#9CA3AF` |
| headerBackground | `#FFFFFF` | `#1F2937` |
| headerBorder     | `#F3F4F6` | `#2D3748` |

### Input Fields

| Token            | Light     | Dark      |
| ---------------- | --------- | --------- |
| inputBackground  | `#FFFFFF` | `#374151` |
| inputBorder      | `#E5E7EB` | `#4B5563` |
| inputText        | `#1F2937` | `#F9FAFB` |
| inputPlaceholder | `#9CA3AF` | `#9CA3AF` |

---

## Spacing Rules

### Standard Spacing Scale

| Size | Value  | Usage                                                 |
| ---- | ------ | ----------------------------------------------------- |
| xs   | `4px`  | Icon-to-text gaps, tight padding                      |
| sm   | `6px`  | Small button internal gaps                            |
| md   | `8px`  | List item gaps, small margins                         |
| lg   | `12px` | Card padding, section gaps, button rows               |
| xl   | `16px` | Screen padding, dialog padding, major section margins |
| 2xl  | `20px` | Screen-level horizontal/vertical padding              |
| 3xl  | `24px` | Dialog internal padding                               |

### Screen-Level Layout

- Horizontal padding: `20px`
- Vertical padding: `16–20px`
- Section gap: `12–16px`

### Cards and List Items

- Padding: `12–16px`
- Gap between items: `8–12px`
- Border radius: `12px`

### Dialogs (Slide-Down, Alert, Modal)

- Padding: `16–24px`
- Border radius: `16px`
- Border width: `1px`
- Shadow: `shadowColor: "#000"`, offset `{0, 4}`, opacity `0.3`, radius `12`, elevation `8`

---

## Typography

| Style                | Size   | Weight           |
| -------------------- | ------ | ---------------- |
| Screen title         | `24px` | `700` (bold)     |
| Section title        | `18px` | `600` (semibold) |
| Card title           | `16px` | `600`            |
| Body text            | `14px` | `400` (normal)   |
| Subtitle / Secondary | `13px` | `400`            |
| Caption / Small      | `12px` | `400`            |
| Tiny (badges)        | `9px`  | `600`            |
| Button text          | `14px` | `600`            |

---

## Button Patterns

### Primary Button (Filled)

- Background: `#0EA5E9` (theme blue)
- Text: `#FFFFFF`, 14px, weight 600
- Border radius: `10px`
- Padding: `12px` vertical
- Include icon (size 16) with `marginRight: 6` before text
- `activeOpacity: 0.7`

### Outline Button (Secondary)

- Background: `transparent`
- Border: `1.5px solid #0EA5E9`
- Text: `#0EA5E9`, 14px, weight 600
- Border radius: `10px`
- Padding: `12px` vertical
- Include icon (size 16, color `#0EA5E9`) with `marginRight: 6` before text
- `activeOpacity: 0.7`

### Danger Button

- Background: `#EF4444`
- Text: `#FFFFFF`, 14px, weight 600
- Border radius: `10–12px`

### Disabled Button

- Background: `#9CA3AF`

### Button Row Layout

- `flexDirection: "row"`, `gap: 12`
- Each button: `flex: 1`, `flexDirection: "row"` (for icon + text)
- Primary action on the LEFT, secondary/cancel on the RIGHT

---

## Icon Standards

### Action Icons

- Size: `20px` (standard actions)
- Size: `16px` (inside buttons)
- Size: `24px` (map controls, navigation)
- Library: `@expo/vector-icons` → `Ionicons`
- Trash/delete icons: colored `#EF4444`

### Icon Containers (Circular)

- Small: `36×36px`, borderRadius `18px`
- Large: `40×40px`, borderRadius `20px`
- Background: `#0EA5E9` (primary) with white icon

---

## Avatar Styling

### Family Tab

- Border: `3px solid rgba(255,255,255,0.8)`
- Status dot border: `3px`
- Status dot position: `bottom: 0, right: 0`

### Map Tab

- Border: `2px solid rgba(255,255,255,0.8)`
- Status dot border: `2px`
- Status dot position: `bottom: 0, right: 0`

---

## Component Patterns

### Dialog Box (Slide-Down)

```
Style: styles.slideDownDialog
- borderRadius: 16
- padding: 16
- shadowColor: "#000"
- shadowOffset: { width: 0, height: 4 }
- shadowOpacity: 0.3
- shadowRadius: 12
- elevation: 8
- borderWidth: 1
- backgroundColor: colors.dialogBackground
- borderColor: colors.dialogBorder
```

### Header Row (inside dialogs)

```
flexDirection: "row", alignItems: "center"
Icon container (36×36, blue circle) + marginRight: 12 + text container (flex: 1)
```

### Map Control Buttons

```
- Size: 44×44px
- Border radius: 22px (circle)
- Border width: 1px
- Background/border/icon use theme controlButton tokens
- Shadow: shadowColor "#000", offset {0,2}, opacity 0.15, radius 4, elevation 3
```

### Place Markers (Map)

```
- Size: 24×24px
- Border radius: 8px (rounded square)
- Border: 2px solid #fff
- Inner dot: 8×8px, borderRadius 4, white
- Shadow: shadowColor "#000", offset {0,2}, opacity 0.3, radius 4, elevation 5
```

### Alert Dialog

```
- Overlay: rgba(0,0,0,0.5)
- Container: borderRadius 16, padding 24
- Icon container: 64×64px, borderRadius 32
- Title: 18px, weight 600
- Message: 14px
- Button: paddingVertical 14, borderRadius 12
```

---

## Usage

Always import colors via `useThemeColors()` from `mobile/theme/colors.ts`. Never hardcode light/dark values inline — use the theme tokens. The only exception is semantic colors (status, category, primary blue) which are constant across themes.
