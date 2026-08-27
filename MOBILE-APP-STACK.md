# Mobile App Stack: React Native skills from the Vercel libraries

Skills adopted for the planned **React-based mobile app** (one codebase, shipped to both
the Play Store and the App Store). Stack assumption: **Expo (React Native) with EAS Build**,
which is the standard way to ship a React codebase to both stores without maintaining two
native projects by hand.

**Last updated:** 2026-08-13. All nine skills were cloned directly from GitHub and are
vendored under `skills/` in this repo, so every entry below is verified (fetched, frontmatter
parsed, directory name matches the declared `name:` field).

> **Discovery note.** The `skills.sh` registry is unreachable from this network (the proxy
> answers 403 to CONNECT), and the `skills` CLI fails silently when that happens: `npx skills
> find <query>` prints "No skills found" and exits 0. Treat any empty result from that CLI on
> this network as an outage, not an answer. Everything here was found by cloning the source
> repos and reading them.

## Adopted skills

| Skill (dir under `skills/`) | Source repo | Path in source | Commit | Licence | Helps you... |
|---|---|---|---|---|---|
| `vercel-react-native-skills` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/react-native-skills` | `dd089a8` | MIT (frontmatter; repo has no LICENSE file) | RN and Expo best practices: a rules library covering list performance, native modals, Expo Image, Pressable, Reanimated derived values, monorepo native deps. The core skill for this build. |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/react-best-practices` | `dd089a8` | MIT (frontmatter; repo has no LICENSE file) | React performance guidelines from Vercel engineering; applies to RN components as much as web. |
| `vercel-composition-patterns` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/composition-patterns` | `dd089a8` | MIT (frontmatter; repo has no LICENSE file) | Component APIs that scale: compound components, render props, context, React 19 changes. |
| `writing-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/writing-guidelines` | `dd089a8` | MIT (frontmatter; repo has no LICENSE file) | Reviewing app copy and docs; in-app microcopy is most of a helper app's UX. |
| `ai-sdk` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | `.agents/skills/ai-sdk` | `cf865e9` | MIT | Building AI features (the lease-decoder concept needs an LLM behind it). |
| `frontend-design` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | `.agents/skills/frontend-design` | `cf865e9` | MIT | Distinctive, production-grade interface design; principles carry to native screens. |
| `web-animation-design` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | `.agents/skills/web-animation-design` | `cf865e9` | MIT | Easing, duration, and reduced-motion judgement; maps to Reanimated and Moti. |
| `emil-design-eng` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | `.agents/skills/emil-design-eng` | `cf865e9` | MIT | UI polish and the invisible details that make an app feel considered. |
| `code-review` | [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) | `.agents/skills/code-review` | `cf865e9` | MIT | Reviewing diffs and PRs during the app build. |

## Surveyed and not adopted

From the same two repos, with the reason each was left out:

| Skill | Why not |
|---|---|
| `react-view-transitions` | Web View Transition API only; React Native has no such API. |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | Web hosting and Vercel billing; a store-distributed mobile app does not deploy this way. |
| `web-design-guidelines` | Audits DOM and CSS specifics that do not exist in RN; the design skills above cover the transferable part. |
| `baseline-ui` | Tailwind-specific checks; only relevant if the app adopts NativeWind, which is undecided. |
| `chat-sdk`, `agent-browser`, `workflow`, `deploy-open-harness`, `plan-mode`, `remove-demo-limits` | Platform bots, browser automation, and harness tooling; nothing to do with this build. |

## How these fit the app build

1. **Scaffold**: Expo app with TypeScript, EAS Build profiles for both stores.
2. **Write screens** with `vercel-react-native-skills` (lists, images, animations, modals)
   and `vercel-react-best-practices` for render discipline.
3. **Shape the component API** with `vercel-composition-patterns` before the screen count grows.
4. **Design pass** with `frontend-design`, `emil-design-eng`, and `web-animation-design`.
5. **AI features** (lease decoding, plain-language explanations) with `ai-sdk`.
6. **Every PR** through `code-review`; every user-facing string through `writing-guidelines`.
