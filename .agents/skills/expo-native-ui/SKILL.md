---
name: expo-native-ui
description: Use when implementing or reviewing RoadGuard Android-first Expo layout, controls, safe area, keyboard, accessibility or interaction states.
license: MIT
---

# Expo Native UI — RoadGuard adoption

Source: expo/skills @ 6d0506afe7df9334b60ad4b1ceb35969836f01a0. Original and targeted reference files are in references/. AGENTS.md, skills/DESIGN.md, actual package.json, component and BE contracts override upstream examples.

- RoadGuard Expo SDK 58.0.25, expo-router 58.0.31, RN 0.88.1 at reviewed baseline; recheck actual versions on every version-sensitive task. @expo/ui, expo-symbols and expo-image are NOT installed at baseline. Do not add dependencies or change nav/config/storage/provider merely because upstream suggests it.
- Android-first: MaterialIcons, existing SafeAreaScreen/AppHeader/BottomNav/Expo Router, native controls already available, 48dp touch targets, system font scaling, readable primary action, grouped sections, keyboard-safe scroll and focus. Use native platform affordances without transplanting iOS UI or rewriting routes.
- Prefer clear screen job, real loading/empty/error/content/offline states, stable scroll and drafts, visible reason for locked actions, no fake success. Keep current behavior and authority; report functional defects separately. Never automatically enable an action barred by policy or BE.
- Read upstream references/controls.md, references/icons.md, references/media.md, references/storage.md, references/visual-effects.md only for task-specific context; do not change media/storage/crypto or implement visual effects without scope. For motion use approved Expo building-native-ui animation references or Vercel guidance; no new packages. Do not default to Expo Go for native crypto/SQLCipher acceptance; RoadGuard has local native modules and custom QA APK.
- Verify primary user task plus error/recovery, Android back/keyboard/scroll/safe area/long text, actual screenshot at relevant states. Mark NOT_RUN if runtime verification not assigned. No installer, EAS/agent CLI invocation, feedback or deployment by virtue of skill alone.
