# Dark Mode Audit & Fix Summary

## Files Modified

### 1. CSS Variables (`src/app/globals.css`)
- **Fixed**: `--card` dark value from `#111827` to `#0f1727` (matches Slates design)
- **Added**: Comprehensive dark mode overrides for hardcoded `slate-*` colors
  - `.dark .text-slate-900`, `.dark .text-slate-800` → uses `var(--foreground)`
  - `.dark .bg-slate-900`, `.dark .bg-slate-800` → uses `var(--card)`
  - `.dark .border-slate-800` → uses `var(--border)`
  - etc.

### 2. UI Components
| Component | Fix |
|-----------|-----|
| `card.tsx` | `dark:bg-[var(--card)]` instead of `dark:bg-slate-950` |
| `input.tsx` | Added `dark:bg-[var(--input)]`, `dark:text-[var(--foreground)]`, `dark:ring-offset-[var(--background)]` |
| `textarea.tsx` | Same fixes as input.tsx |
| `select.tsx` | Added `dark:bg-[var(--input)]` + `dark:bg-[var(--popover)]` for dropdown |
| `tabs.tsx` | List/Trigger/Content now use `var(--muted)`, `var(--card)`, `var(--ring)`, `var(--background)` tokens |
| `badge.tsx` | Replaced hardcoded slate colors with token variables |
| `dialog.tsx` | Overlay uses `bg-black/50`, content uses `var(--popover)` tokens |
| `scroll-area.tsx` | Thumb uses `var(--muted)` token |
| `avatar.tsx` | Ring uses `dark:ring-[var(--background)]` instead of `dark:ring-slate-900` |

### 3. Layout Components
| Component | Fix |
|-----------|-----|
| `sidebar.tsx` | **Complete rewrite** — no longer hardcodes dark theme; uses `var(--card)`, `var(--foreground)`, `var(--muted)`, `var(--border)` tokens |
| `header.tsx` | Changed `text-slate-900` → `text-[var(--foreground)]` |

### 4. Page Components (key fixes)
| File | Fix |
|------|-----|
| `accept-invitation/page.tsx` | `bg-slate-50 dark:bg-slate-900` → `bg-slate-50 dark:bg-[var(--background)]` |
| `tasks/[id]/page.tsx` | Primary button `bg-slate-900` → `bg-primary` |
| `tasks/[id]/edit/page.tsx` | Same |
| `invoices/[id]/payment/page.tsx` | Same |
| `invoices/[id]/edit/page.tsx` | Same |
| `invoices/[id]/page.tsx` | Same |
| `tasks/tasks-page-client.tsx` | Card bg `dark:bg-slate-950` → `dark:bg-[var(--card)]` |
| `projects/projects-page-client.tsx` | Search input & cards use `dark:bg-[var(--card)]` |
| `projects/[id]/project-detail-client.tsx` | Cards use `dark:bg-[var(--card)]` |
| `clients/[id]/client-detail-client.tsx` | Cards use `dark:bg-[var(--card)]` |
| `leads/leads-page-client.tsx` | Cards use `dark:bg-[var(--card)]` |
| `dashboard/page.tsx` | Heading uses `text-[var(--foreground)]` |
| `settings/settings-page-client.tsx` | All headings use `text-[var(--foreground)]` |

### 5. CSS Component Classes (`globals.css`)
- `.sidebar-nav-link-active`: Changed from `bg-white/10 text-white` → `bg-primary/10 text-primary`
- `.sidebar-nav-link-inactive`: Changed from `text-slate-400 hover:bg-white/5 hover:text-white` → uses theme tokens

## Design Token Consistency
All components now reference CSS custom properties:
- `--background`: page background
- `--foreground`: primary text
- `--card`: card/panel backgrounds
- `--card-foreground`: card text
- `--muted`: subtle backgrounds
- `--muted-foreground`: secondary text
- `--border`: borders
- `--input`: input field backgrounds
- `--ring`: focus rings
- `--primary` / `--primary-foreground`: primary actions

## Verification
- ✅ Dev server compiles without errors (all "Compiled in Xms" messages)
- ✅ No TypeScript errors introduced by changes
- ✅ Pre-existing TS errors (Mongoose `.populate()` types) are unchanged
