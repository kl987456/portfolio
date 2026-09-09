# Three.js / Animation Plan — Kamalakar Reddy Portfolio

Status: **mapped against the Stitch reference pack**
Last updated: 2026-09-08
Reference source: `stitch_new_project_setup.zip` (47 files, 4.3MB)

---

## 1. Reference inventory (what actually shipped in the zip)

The spec (`three.js_20_visuals_specification.md`) describes **20** scenes. Only **13 were
exported**, and they split into two very different groups.

### AI-themed — 7 scenes, all directly usable

| Folder | Scene | Spec # |
|---|---|---|
| `three.js_5` | AI Neural Sphere — Fibonacci lattice core, geodesic orbits, pulse waves | 1 |
| `02_ai_agent_swarm` | Cluster-breakaway multi-agent geometry with communication beams | 2 |
| `03_neural_network_tunnel` | Endless curving neural tunnel with synapsing layer rings | 3 |
| `04_ai_computational_brain_mesh` | Dual-hemisphere point-cloud brain, travelling activation waves | 4 |
| `05_agentic_orbit` | Central LLM core with 6 named orbital agents (Planner, Research, Code, Memory, Tools, Evaluator) | 5 |
| `06_ai_data_stream_river` | Braided spline particle ribbons, variable velocities, fluid branching | 6 |
| `07_rag_knowledge_graph` | Vector document clusters with animated query probe and retrieval rays | 7 |

### Fan-art — 6 scenes (plus variants)

`08_naruto_vs_sasuke_…_1`, `08_…_2`, `09_heroic_avatar_rasengan_vs_chidori_warrior`,
`10_marvel_iron_man_mark_85_arc_reactor_nanotech`,
`11_marvel_thor_mjolnir_stormbreaker_bifrost_apex`, plus `three.js_1`, `three.js_2`,
`three.js_4` (Rasengan/Chidori variants), `three.js_3` (nanotech swarm), `three.js_6`
(Mjolnir / Stormbreaker / Bifrost).

**Spec scenes 8–20 were not exported** — no Token Universe, Attention Field, Memory
Palace, Tool-Calling Machine, Multi-Agent Mesh, Embedding Galaxy, Neural Wave, Particle
DNA, Code-to-Agent, Data Rain, Singularity, Holographic Cube, or Neural Corridor. If you
want any of those, they need generating before they can be planned against.

---

## 2. The one big decision: palette

This is the crux, and it needs your call before any code lands.

| | Reference pack | This portfolio |
|---|---|---|
| Canvas | Deep Void `#04060d` / Midnight Carbon `#060913` | Paper `#eeeeeb` |
| Ink | — | `#171b18` |
| Primary | Electric Violet `#8a2be2` | Coral `#e34a39` |
| Data / accent | Cyber Cyan `#00f0ff` | Lime `#c8eb66` |
| Others | Cobalt `#2563eb`, Amber `#ff7b00` | `#ee633f`, `#9eafda`, `#d4c1e5`, `#f2c94c` |

Measured from the files: `02_ai_agent_swarm` uses `#00f0ff` ×12, `#8a2be2` ×5, `#04060d`
×3; `05_agentic_orbit` uses `#00f0ff` ×11, `#8a2be2` ×7, `#04060d` ×3. These scenes assume
a near-black canvas and saturated neon — the exact inverse of this site.

**Recommendation: keep the technique, drop the neon.** Re-tint each scene to the
portfolio palette and let each project's own accent (`project.color` / `project.ink`,
already in `portfolio-data.ts`) drive its scene.

There is precedent in your own code. `components/agent-field.tsx` already runs a glowing
3D scene on the paper background — it sets `scene.fog.density = 0` with the comment
*"paper background — depth read via scale/opacity, not a fog tint"*. That file is the
proof this works, and the pattern to copy.

The alternative — going dark for whole sections — is viable but a much bigger design
change, and it would fight the intro curtain, the project artwork, and the gallery.
Only the intro screen (`#171b18`), the page wipe (`#182018`) and the contact overlay are
dark today.

---

## 3. What already exists

Do not re-plan these; extend them or leave them alone.

| Layer | Where | Technique |
|---|---|---|
| **Three.js constellation** | Menu overlay only | `components/agent-field.tsx` — pulsing core plus one orbiting node per flagship project, each with that project's accent and a distinct geometry, joined by beams with travelling photons. Additive blending, emissive materials, ACES tone mapping, no composer. Already `lazy()` + dynamic import, waits for container layout, honours `prefers-reduced-motion`, disposes fully. |
| 2D agent network | Every `/project/[slug]` | `agent-walkthrough.tsx` — SVG nodes/edges, `moving-signal` photons, 4-stage timeline. |
| SVG system maps | Project cards and detail art | `SystemMap`; `wire-flow`, `node-breathe`. |
| Sprite animation | Intro curtain | `character-sheet-12.png` via `@keyframes sprite`. |
| CSS motion | Site-wide | `reveal`, `[data-parallax]`, `page-wipe`, `roll-label`, `slow-spin`, `portrait-reveal`, `studio-drift`. |

`05_agentic_orbit` is conceptually the same idea `agent-field.tsx` already implements —
a central core with named specialist agents orbiting it. Treat it as the upgrade target
for that component rather than as a new scene.

---

## 4. Reference → placement mapping

### Project heroes — one scene per project, matched to what the project actually does

Each replaces/augments `project-visual`. Keep the SVG `SystemMap` below it.

| Project | Reference | Why it fits |
|---|---|---|
| **Atlas** — citation-first RAG that grades its own evidence | `07_rag_knowledge_graph` | Exact match: document embedding clusters, query probe, retrieval rays. |
| **ResearchForge** — supervisor + 3 parallel channels → filter → synthesis | `02_ai_agent_swarm` | Cluster breakaway with live communication beams is literally parallel specialists reporting back. |
| **ForgeGuard** — supervisor coordinating analyst / planner / proposals / reviewer → human gate | `05_agentic_orbit` | The spec names Planner, Code and Evaluator as orbital agents — ForgeGuard's own roles. |
| **Aperture** — question → validated SQL → evidence rows + chart | `06_ai_data_stream_river` | Braided ribbons with branching read as rows flowing out of an accepted query. |
| **Workforce AI** — voice events → 8 rule workflows → pipeline | `three.js_5` (Neural Sphere) | Dense core with pulse waves reads as reconciling many async events into one call record. |

### Section backgrounds

| Placement | Reference | Notes |
|---|---|---|
| **`work-feed` on `/`** (~7,400px of new scrolling content, no visual anchor) | `03_neural_network_tunnel` | An endless tunnel is the one scene whose whole point is continuous forward travel — pair camera Z to scroll. Best single win available. |
| **`/about`** | `04_ai_computational_brain_mesh` | The human/thinking page. Use sparingly behind `about-lead`; see §5 risk note. |
| **Menu overlay** | `05_agentic_orbit` | Upgrade the existing constellation toward the named-agent version. |
| **404** | cheapest of the above | Contained trial of the re-tinted look. Nothing depends on it. |

### Fan-art — Playground, and only Playground

The Naruto, Iron Man and Thor scenes do not belong on the work or project pages. But this
portfolio already has the right home for them: `/playground` is explicitly *"a little
beyond the code… a space for the person behind the projects"*, already mixing personal
photographs with labelled AI compositions.

Proposal: add a small number of these as interactive gallery entries alongside the
photographs, labelled the way the AI composites already are (`kind: 'WEBGL SCENE'`).
Launch each in the existing lightbox rather than inline, so only one runs at a time and
it mounts on click — which satisfies the one-context rule for free.

Pick **two or three**, not nine. There are five near-duplicate Rasengan/Chidori variants
(`08_1`, `08_2`, `09`, `three.js_1`, `three.js_2`, `three.js_4`); choose the best one.
Suggested set: best Rasengan/Chidori + `10` Iron Man + `11` Thor.

**Note on the fan-art:** these depict trademarked characters (Naruto/Shueisha,
Marvel/Disney). Fine as personal-portfolio fan work, and no logos or official art are
involved — but they sit on a public site under your name, so keep them clearly in the
personal/playground context and off the professional pages. Your call.

---

## 5. Porting requirements — this is not copy-paste

Every reference is a standalone demo page. Measured facts:

| Issue | Detail |
|---|---|
| **Three.js version** | All refs load **r125** (one loads r128) from `ajax.googleapis.com`. The project runs **0.185.1** — roughly 60 releases newer, with real breaking changes (renamed colour-management/encoding properties, removed legacy geometry paths). Code needs porting, not pasting. |
| **Tailwind CDN** | Every ref pulls `cdn.tailwindcss.com`. Not needed — this project builds Tailwind 4. Strip it. |
| **No accessibility** | **0 of 17 files** reference `prefers-reduced-motion`. Every scene must gain a static path before shipping. |
| **No visibility gating** | 0 files use `IntersectionObserver` or `visibilitychange`. Offscreen scenes would spin at 60fps and drain battery. |
| **Standalone page shape** | Each owns `document.body`, full-viewport canvas, and its own resize logic. Must become a mounted component sized to its container, like `agent-field.tsx`. |
| **Disposal** | Most do call `.dispose()`, which is a good starting point, but not on a React unmount path. |

`agent-field.tsx` already solves all six of these. Port each scene *into its shape*.

---

## 6. Proposed structure

```
components/webgl/
  use-webgl-scene.ts   # renderer/camera/scene, resize, rAF, dispose, reduced-motion
  webgl-host.tsx       # lazy boundary + IntersectionObserver + visibilitychange gating
  scenes/
    constellation.ts   # from the current agent-field.tsx
    agentic-orbit.ts   # 05
    rag-graph.ts       # 07
    agent-swarm.ts     # 02
    data-river.ts      # 06
    neural-sphere.ts   # three.js_5
    neural-tunnel.ts   # 03
    brain-mesh.ts      # 04
    playground/…       # fan-art scenes
```

Each scene exports `build(scene, THREE, { accent, ink, reduceMotion })` so the palette
decision from §2 lives in one place per scene, not scattered through it.

---

## 7. Guardrails

1. **Never in the critical path.** Three.js is ~150KB gzipped, larger than the rest of the
   site combined. Today it loads only when the menu overlay opens. Keep every placement
   behind `lazy()` + dynamic import, gated on intent.
2. **One renderer at a time.** Several live WebGL contexts is the fastest way to make this
   site feel broken on mid-range Android. Share one host.
3. **Don't 3D-ify what SVG already does better.** The walkthrough and system maps are
   legible, cheap, indexable and print fine.
4. **Reduced motion is mandatory**, and none of the refs have it.
5. **Decorative only.** No content may live solely in a canvas; a lost WebGL context must
   never hide information. Keep `pointer-events:none` unless interaction is the point.
6. **Pause when unseen** — IntersectionObserver + `visibilitychange`.

| Budget | Target |
|---|---|
| Three.js in initial bundle | 0 bytes |
| Simultaneous WebGL contexts | 1 |
| Draw calls per scene | ≤ 30 |
| `setPixelRatio` | `min(devicePixelRatio, 2)` (already done) |
| Frame budget, mid-tier mobile | ≤ 8ms |
| WebGL unavailable | Page fully usable, canvas simply absent |

---

## 8. Undeclared dependency to fix first

`npx tsc --noEmit` passes right now (0 errors), but only by luck:
**`@types/three@0.185.4` sits in `node_modules/@types/` and is declared nowhere in
`package.json`**, and no installed package depends on it. `three` ships no declarations of
its own.

A clean checkout, fresh install, or CI will therefore fail with:

```
components/agent-field.tsx(30,34): error TS7016: Could not find a declaration file for module 'three'
components/agent-field.tsx(292,25): error TS7006: Parameter 'obj' implicitly has an 'any' type
```

Both were reproducible in this repo earlier today, before the types package appeared.

```bash
npm i -D @types/three@0.185.4
```

Then re-type the disposal traversal at `agent-field.tsx:292`; it currently casts through
`unknown` to work around the missing types.

---

## 9. Sequence

1. Declare `@types/three` (§8) and clear the cast.
2. **Decide §2** — re-tint to paper palette (recommended), or go dark per section.
3. Port **one** scene to the agreed palette as a trial. Suggested: `07_rag_knowledge_graph`
   on the Atlas hero — the tightest content match, and a self-contained page.
4. Review that trial before porting more. If the re-tint reads well, the rest is mechanical.
5. Extract the shared host (§6).
6. Ship the remaining project heroes, then `03_neural_network_tunnel` on the work feed.
7. Re-measure against §7. Only then consider `/about` and the Playground fan-art.

## 10. Open questions for you

1. **Palette** — re-tint to paper, or go dark for these sections? (§2)
2. **Fan-art** — include on Playground, and which two or three? (§4)
3. **Missing scenes** — do you want spec #8–20 generated, or is the exported set enough?
4. Do you still want the **original portfolio reference link** from your first message
   applied? That one is still outstanding and unrelated to this pack.
