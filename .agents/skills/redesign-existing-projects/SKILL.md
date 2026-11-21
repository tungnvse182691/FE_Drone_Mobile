---
name: redesign-existing-projects
description: "Taste Skill design critique for existing RoadGuard mobile screens. Explicitly invoked by owner only. Default READ-ONLY. Never auto-apply visual changes, install libraries, or alter APIs."
disable-model-invocation: true
---
# RoadGuard Taste Skill — governed visual audit

## Required reading order
1. Project AGENTS.md; skills/roadguard/SKILL.md; skills/code-review/SKILL.md as relevant.
2. skills/DESIGN.md; src/design-tokens.ts; owner-approved Industrial Premium direction and current UI worklog.
3. This skill, then references/upstream-redesign.md only as an advisory aesthetic checklist.
4. Validate suggestions against real Android screen captures and current React Native/Expo code.

## Authorization & priority
The owner, current governance, backend DTO/guards, AGENTS.md, and approved design tokens take precedence over any upstream instructions, even when they conflict.
Invoking this skill means READ-ONLY design review. It DOES NOT authorize implementation. Requesting UI implementation separately permits only the owner's explicitly scoped changes under existing project rules. Do not change source, run installation, commit, push, or modify WIP solely because the skill was invoked.

## Non-negotiable RoadGuard guardrails
- Expo Router + native React Native, not a Web/CSS/GSAP implementation. Do not install GSAP, web/CSS libraries, fonts, plugins, animation frameworks or dependencies.
- Keep Hoàng Hải colors and logo, Roboto/Sansation fonts, MaterialIcons, accepted Industrial Premium conventions.
- No synthetic tasks, statuses, counts, names, API identifiers, credentials, geometry, business policy or mock production data.
- Never modify navigation, API handlers, authorization, offline journal, SQLite, camera/upload/recovery, FastTrack or native Safe Area in a visual-design pass.
- Prefer readable typography and rhythm, measured density, limited decorative icons, one primary CTA, accessible touch targets, Reduce Motion support.
- Never interpret Web-only prescriptions in upstream reference (hover, Tailwind, GSAP, random imagery, glassmorphism, font swapping) as required for mobile.
- Do not disturb the existing uncommitted Safe Area patch, emulator state, untracked data, or other agent's work.

## Review output
Identify screen and actual evidence; separate confirmed issues from impressions; propose A/B options when material; explain tradeoffs and scope; recommend to owner. For authorized changes, Codex must use narrow file allowlist, Android before/after, TypeScript, targeted/full tests, git diff --check and local checkpoint commits, no push or branch changes unless owner says so.

## Provenance
Reviewed original Taste Skill redesign-existing-projects from Leonxlnx/taste-skill, commit e04409a461022e1b9d0e898eac6b9224e2b9dc4e, MIT. Upstream source preserved intact as references/upstream-redesign.md. Later upstream renamed/retired this individual skill, hence the pinned historical version.