# OmniFlow EMS & WhatsApp CRM — Design System Governance Rules
**Version**: 2.0  
**Effective Date**: July 30, 2026  
**Scope**: All AI agents, frontend developers, and UI engineers modifying or adding interfaces to OmniFlow EMS / CRM.

---

## Absolute Color Palette Lock

The approved brand color scheme is immutable across all existing and future application modules:

- **Main Accent Gradient**: `linear-gradient(135deg, #0d9488 0%, #064e43 100%)` (Deep Emerald / Teal)
- **Sidebar & Header Identity**: `#0f2b26` (Dark Emerald Navy) & `#0f172a` (Slate Navy)
- **System Primary**: `#2563eb` (Royal Blue / Slate Accent)
- **Success Status**: `#10b981` / `#059669`
- **Warning Status**: `#f59e0b` / `#d97706`
- **Danger Status**: `#ef4444` / `#b91c1c`
- **Page Canvas Background**: `#f8fafc`
- **Default Application Theme**: `emerald`

---

## 15 Mandatory Development Rules

1. **Never Invent Page-Specific Brand Colors**: Do not add arbitrary hex colors in component inline styles or new CSS files.
2. **Never Change Approved Theme Palette**: Do not convert the application to plain blue, dark gray, or random custom themes.
3. **Use Centralized Design Tokens**: Always reference `--color-primary`, `--bg-page`, `--text-primary`, `--space-4`, `--radius-md`, and `--z-modal` from `src/index.css`.
4. **Use Existing Global Components First**: Prioritize primitives from `src/components/ui/` (`Button`, `Input`, `SearchInput`, `Select`, `Card`, `StatCard`, `Badge`, `PageHeader`, `Toolbar`, `Modal`, `Drawer`, `Tabs`, `Pagination`) before writing custom elements.
5. **Choose the Correct Page Pattern**: Standardize layout structures using pattern primitives in `src/components/patterns/`:
   - `DashboardPattern` (KPI Grid + Analytics)
   - `ListPattern` (Tables + Toolbar + Pagination)
   - `KanbanPattern` (CRM Drag & Drop Stages)
   - `InboxPattern` (Multi-agent WhatsApp Stream)
   - `SettingsPattern` (Sidebar Nav + Section Card)
   - `FormPattern` (Grouped Inputs + Save Footer)
   - `DetailPattern` (Profile Header + Tabs + Info Grids)
6. **Do Not Force Irrelevant Features**: Do not attach search, filters, or bulk actions to pages that do not have backend support or data lists.
7. **No Random Button Styling**: Use `Button` variants (`primary`, `secondary`, `danger`, `success`, `outline`, `ghost`).
8. **No Random Card Styling**: Use `Card` or `StatCard` with standard borders (`1px solid #e2e8f0`) and subtle shadows.
9. **No Arbitrary Breakpoints**: Adhere to standard breakpoints (`360px`, `390px`, `768px`, `1024px`, `1280px`, `1440px`, `1920px`).
10. **Mobile First Usability**: Every interactive element must provide touch-friendly interaction targets (min 40px–44px height) and horizontal swipe wrappers for data tables (`.mobile-swipe-hint`).
11. **Mandatory Loading, Empty & Error States**: Include `Spinner`, `Skeleton`, `EmptyState`, and `ErrorState` handling for all async data operations.
12. **Accessible Controls**: Icon-only buttons must provide `aria-label` tags or `Tooltip` text.
13. **Confirmation for Destructive Actions**: Purging, deleting, or overwriting records requires custom modal confirmation with `danger={true}` styling.
14. **Separate Business Logic from Presentation**: Do not embed raw Firebase/Socket API query logic inside UI primitives.
15. **Consistent Design Language**: A page may feature custom internal data structures but must strictly adhere to the unified visual appearance.

---

```
VERIFIED ARCHITECTURE STACK:
CSS Tokens (src/index.css) ➔ UI Primitives (src/components/ui/) ➔ Page Patterns (src/components/patterns/)
```
