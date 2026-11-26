# RoadGuard third-party UI skill sources

Agent guidance and local Python search tooling only; no runtime dependencies. Owner prompt grants scope; AGENTS.md, skills/DESIGN.md, src/design-tokens.ts, canonical governance and current BE contract govern external advice.

| Installed skill | Upstream | Pinned commit | License | Installed files |
|---|---|---|---|---|
| ui-ux-pro-max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `a0d04109f4193a04ec6959549cd735d95ecaa90a` | MIT (LICENSE included) | 24 originals from `.claude/skills/ui-ux-pro-max`: upstream SKILL, pro-rules/quick-reference, selected intelligence data, RN stack, five Python scripts, LICENSE; RoadGuard wrapper |
| expo-design-system | https://github.com/expo/skills | `6d0506afe7df9334b60ad4b1ceb35969836f01a0` | MIT (LICENSE included) | 4 originals from `plugins/expo/skills/expo-design-system`: upstream SKILL, audit, native-slop, LICENSE; RoadGuard wrapper |
| expo-native-ui | https://github.com/expo/skills | `6d0506afe7df9334b60ad4b1ceb35969836f01a0` | MIT (LICENSE included) | 9 originals from `plugins/expo/skills/expo-native-ui`: upstream SKILL, controls/icons/media/storage/gradients/visual-effects/webgpu-three, LICENSE; RoadGuard wrapper |
| vercel-react-native-skills | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT (as declared in SKILL.md) | SKILL.md, README.md, AGENTS.md, metadata.json, rules/, .gitattributes |

The three new directories reuse owner-provided staging after checking all 37 originals using `git hash-object --no-filters` and byte size. No installer or repository download. [UI-SOURCES-MANIFEST.json](UI-SOURCES-MANIFEST.json) retains exact URL/path/hash/size mapping; paths are relative to this directory. Original SKILL files are preserved in `references/upstream-SKILL.md`; root SKILL.md files are RoadGuard adaptations outside that manifest. Selected files support mobile reference/search without the full CLI, other platform stacks, branding or slides. Original Web/effect examples remain advisory references, not authority to implement them. Vercel files stay as previously installed; only its wrapper routing changes.

Local `.gitattributes` preserves the three imported directories and manifest without line-ending conversion on Windows. Pinned `design_system.py` has 46 space-only lines: only that original file exempts end-of-line whitespace checks, preserving its verified blob; RoadGuard edits keep normal whitespace checks.

The existing owner-installed 13-skill Expo marketplace plugin remains separate and unchanged. Its verified UI skill is `building-native-ui`, with `references/animations.md` for motion; the new local `expo-design-system`/`expo-native-ui` directories do not imply those names exist in that marketplace build. Do not assume `expo-animation` is installed or copy/reinstall the plugin.

RoadGuard owner decisions and AGENTS.md / skills/DESIGN.md / src/design-tokens.ts always govern product colors, routes, permissions, and package changes. Third-party recommendations such as FlashList, native stacks, iOS design idioms, or new packages are not automatic change approvals.

Select only relevant guidance: Pro Max for visual direction/hierarchy/targeted UX; Expo Design System for tokens/shared variants/drift; Expo Native UI for Android layout/controls/keyboard/accessibility; Vercel for performance/render/list/animation. No mandatory bulk reading. Pro Max may return marketing heroes, CSS, Google Fonts or blue/orange palettes: filter against RoadGuard. RN catalog targets 0.86.x; verified package baseline is Expo ~58.0.25, Router ~58.0.31, RN 0.88.1, React 19.3.0, Reanimated 4.7.1. Check current installed source before using examples. No second theme, sensitive query data, `--persist`/`--force`/`--preview`, new dependency or business/security changes through skills.

## Retired skills — history only, owner decision 2026-11-26

- `mobile-design`: RubenGlez/mobile-design at `9d220f76b21e83ae9a48f0adaf64842d08fac56e`, MIT. Field/offline/form/localization/accessibility invariants remain in DESIGN.md. Removed from discovery; Git history is recovery.

- Retired local skill: redesign-existing-projects (governed RoadGuard wrapper)
- Source: https://github.com/Leonxlnx/taste-skill/tree/e04409a461022e1b9d0e898eac6b9224e2b9dc4e/skills/redesign-skill
- Pinned upstream SHA: e04409a461022e1b9d0e898eac6b9224e2b9dc4e
- Upstream document SHA256: A75D547D04595FE97A5D377DDDF145D029D51487A4F2A0A5A9D3B532CA3B84CD
- License: MIT. Removed files: SKILL.md (RoadGuard read-only wrapper), LICENSE, references/upstream-redesign.md (unmodified upstream), agents/openai.yaml (explicit-only invocation). Git history is recovery; no backup in discovery paths.
- Note: Later upstream retired this separate skill in favor of a unified Taste skill; this version is pinned deliberately.
- Historical installation used audited Markdown, no installer or runtime dependencies. Attribution and historical evidence remain; this retired source has no active routing.
