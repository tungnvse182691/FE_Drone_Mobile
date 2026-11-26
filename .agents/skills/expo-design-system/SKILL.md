---
name: expo-design-system
description: Use when auditing or implementing RoadGuard Expo design tokens, shared components, variants or visual consistency within an authorized scope.
license: MIT
---

# Expo Design System — RoadGuard adoption

Source: expo/skills @ 6d0506afe7df9334b60ad4b1ceb35969836f01a0. Read references/upstream-SKILL.md, references/audit.md and references/native-slop.md only for relevant sections. Project AGENTS.md, skills/DESIGN.md, src/design-tokens.ts and owner decisions govern; task prompt alone grants edit/build/QA scope.

- Adopt before building: use the existing src/design-tokens.ts as the single theme entry point; no second src/theme, CSS/Tailwind, package, token rewrite or automatic dark/dynamic colors. Keep existing brand and approved role-specific overrides unless owner separately authorizes changes.
- Measure candidate drift in app/ and src/components/ against actual scale. Raw hex, raw fontSize, spacing/radius and custom tappables are candidates, not automatically defects. Check screenshot and caller; record source:line and scope. Use audit.md adapted to PowerShell/git grep, not blind shell scripts.
- Prioritize hierarchy/contrast, proximity/white space, repetition and alignment. Look for Everything's a Card, Wireframe Borders, 16-Everything, oversized headers, false loading/empty states and disabled state mismatch. Do not remove necessary information/actions.
- Reuse or extend actual Button/Card/Chip/Header variants when authorized; inspect all callers and style precedence. Prefer composition; extract only repeated, nameable roles with smaller APIs. Avoid global change for one screen unless impact is verified and scope permits.
- For visual change: approve direction or reference screen when needed, implement incrementally, screenshot before/after, check state, accessibility and all affected callers, run project gates. No big-bang migration. Never bypass business/crypto/auth/offline guards or invent data for visuals.
- Upstream examples may assume new projects, dynamic colors, native headers, new packages or a different platform. They are not automatic RoadGuard changes. No feedback/telemetry or external commands without owner authorization.
