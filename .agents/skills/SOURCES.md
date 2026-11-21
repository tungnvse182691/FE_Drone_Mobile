# RoadGuard third-party UI skill sources

These are agent instructions only. No JavaScript/native dependencies were added.

| Installed skill | Upstream | Pinned commit | License | Installed files |
|---|---|---|---|---|
| mobile-design | https://github.com/RubenGlez/mobile-design | `9d220f76b21e83ae9a48f0adaf64842d08fac56e` | MIT (LICENSE included) | SKILL.md, README.md, LICENSE, references/ |
| vercel-react-native-skills | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT (as declared in SKILL.md) | SKILL.md, README.md, AGENTS.md, metadata.json, rules/, .gitattributes |

Both were downloaded as pinned GitHub ZIP archives and copied selectively as documents. No upstream installer or script was executed.

Codex Expo Plugin (owner-installed, 13-skill marketplace build) is separate. Its verified UI skill is `building-native-ui`, with `references/animations.md` for motion; do not assume `expo-design-system` or `expo-animation` exist in this installed build. These newer names are listed in https://github.com/expo/skills but not in the 13-skill https://github.com/openai/plugins/tree/main/plugins/expo/skills layout.

RoadGuard owner decisions and AGENTS.md / skills/DESIGN.md / src/design-tokens.ts always govern product colors, routes, permissions, and package changes. Third-party recommendations such as FlashList, native stacks, iOS design idioms, or new packages are not automatic change approvals.

## Taste Skill — owner-controlled RoadGuard design audit (2026-11-20)

- Installed local skill: redesign-existing-projects (governed RoadGuard wrapper)
- Source: https://github.com/Leonxlnx/taste-skill/tree/e04409a461022e1b9d0e898eac6b9224e2b9dc4e/skills/redesign-skill
- Pinned upstream SHA: e04409a461022e1b9d0e898eac6b9224e2b9dc4e
- Upstream document SHA256: A75D547D04595FE97A5D377DDDF145D029D51487A4F2A0A5A9D3B532CA3B84CD
- License: MIT. Files: SKILL.md (RoadGuard read-only wrapper), LICENSE, references/upstream-redesign.md (unmodified upstream), agents/openai.yaml (explicit-only invocation)
- Note: Later upstream retired this separate skill in favor of a unified Taste skill; this version is pinned deliberately.
- Installed manually by copying audited Markdown. No installer or script executed and no npm/native dependencies changed. External guidance never supersedes AGENTS.md, design tokens, BE authority, or owner decisions. Use only on explicit owner request.