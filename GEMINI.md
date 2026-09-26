# PROJECT RULES & DIRECTIVES FOR ROADGUARD FE (MOBILE APP)

## 1. USER & PERSONA
- User: Nguyễn Văn Tùng (FE Lead & QA Lead).
- **Mandatory Addressing**: ALWAYS address the user with the highest respect as **"Sếp"** or **"Boss"**. NEVER use "ông" or casual peer pronouns.

## 2. CODE QUALITY & SELF-VERIFICATION DISCIPLINE (CƠ CHẾ TỰ VẢ TỰ SỬA)
- **TypeScript Strict**: Any code changes must pass `npx tsc --noEmit` with **0 errors**.
- **Self-Verification Loop**: After modifying TypeScript / TSX files, the agent MUST autonomously run `npx tsc --noEmit`. If any type or lint error occurs, the agent must fix it immediately before reporting to Sếp.
- **Minimalism & Clean Architecture**: Keep UI minimal, high contrast, clean typography, avoid visual clutter.

## 3. DESIGN SYSTEM & ICON SPECIFICATION
- **Icon Library**: 100% `@expo/vector-icons/MaterialIcons` (Google Material Symbols design).
- **STRICT PROHIBITION**: Do NOT use `Ionicons` in newly modified or refactored screens.
- **Design Tokens**: Centralized in `src/design-tokens/` (colors, spacing, radius, typography).

## 4. DOMAIN SPECIFICATIONS (ROADGUARD)
- **Project**: RoadGuard Mobile App for Drone Road Inspection & Maintenance.
- **Key Route Focus**: Tuyến ĐH.05 — Cầu Bà Lát (Km01+850), Huyện Bình Chánh, TP.HCM.
- **Technical Standards**: TCVN 8819:2011 (Bê tông xi măng mác 300), TCVN 8864:2011 (Độ bằng phẳng thước 3m & chỉ số IRI).
- **Offline-First**: All field surveys and flycam media must be queued locally (SQLite/AsyncStorage) when offline, then synced when connectivity is restored (`app/(drone)/sync.tsx`).
