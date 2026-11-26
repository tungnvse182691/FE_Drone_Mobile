---
name: ui-ux-pro-max
description: Use when designing or reviewing RoadGuard mobile visual direction, hierarchy, UI polish or targeted UX; not for pure business, API or offline logic.
license: MIT
---

# UI/UX Pro Max — RoadGuard mobile adoption

Authority: AGENTS.md, skills/DESIGN.md, src/design-tokens.ts, current owner-approved visual direction, actual FE/BE contract. This skill is advisory; no task, permission, UI change, dependency, or redesign is authorized by loading it.

Source: nextlevelbuilder/ui-ux-pro-max-skill @ a0d04109f4193a04ec6959549cd735d95ecaa90a. Original SKILL preserved in references/upstream-SKILL.md. Selected React Native data and standard-library search scripts are included; not the entire upstream repo. Read references/pro-rules.md for mobile pre-delivery, references/quick-reference.md only for relevant categories.

## Workflow
- Identify role, primary task, actual state, smallest viewport and existing components. Inspect real Android before/after; distinguish design critique from functional defect.
- For visual direction only, generate a candidate with a generic, non-sensitive query. For targeted problems use an explicit domain or react-native stack. From repo root, Windows:
  `python -I -B .agents/skills/ui-ux-pro-max/scripts/search.py "field operations inspection mobile" --design-system -p "Field Operations" -f markdown`
  `python -I -B .agents/skills/ui-ux-pro-max/scripts/search.py "touch feedback responsive layout" --stack react-native -n 2`
  `python -I -B .agents/skills/ui-ux-pro-max/scripts/search.py "text hierarchy card density" --domain ux -n 3`
- Verify result relevance and platform/version; the pinned React Native catalog targets 0.86.x, RoadGuard uses 0.88.1. Prefer installed source and Expo guidance for implementation. Retry once if irrelevant, then label fallback.
- Installed search domains: style, color, product, ux, typography, icons, web, react, chart, landing, gsap. Web/marketing outputs are NOT implementation authority; use only relevant general design insight. Only react-native stack data is installed; google-fonts and other stack catalogs omitted. Do not use persistence, preview, force, token generation into repo, remote font requests, or third-party installers. No secrets or real user data in query.
- Preserve Hoang Hai gold/navy, brand assets, Roboto/Sansation, MaterialIcons, current tokens, Expo Router, accessibility and actual data. Do not apply generated palette, fonts, CSS/Tailwind, GSAP, hero marketing, navigation rewrite, fake priority/status or advice to enable a blocked business action.
- Favor modern field operations: clear title and next action, compact grouped information, evidence and offline state, readable sunlit controls, measured density, purposeful motion. Compare alternatives before any authorized redesign; no cosmetic change to hide errors.
- Implementation uses expo-design-system for consistency and expo-native-ui for platform guidance; Vercel skill for performance. Check only relevant reference and source, no bulk-load.
