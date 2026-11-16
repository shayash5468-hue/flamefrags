# Project memory

## Product intent & audience

- FlameFrags Dashboard: a web-based analytical dashboard built with Vite + React.
- Core modules presented as a 2×2 grid: Frags AI, Data Upload, Flame Visual, Simulation.
- A separate VR project exists but is intentionally not integrated yet.
- Likely audience: analysts/researchers working with fragment or flame-related data (exact domain TBD).

## Brand personality & voice

- Space/cosmic-tech aesthetic (orbital Earth horizon imagery on intro).
- Professional dashboard tone with visually immersive entry experience.

## Visual design & UX direction

- Entry flow: branded intro screen → "Enter Dashboard" button → 2×2 module grid.
- Intro screen elements: FlameFrags logo, animated orbital Earth horizon background.
- Original design, layout, colors, backgrounds, and animations must be preserved across previews.
- Four primary modules: Frags AI, Data Upload, Flame Visual, Simulation.

## Decisions, constraints & rationale

- Framework: vite-react.
- Preview/build uses Vite; `dist` output is required for preview and may need rebuilding after cleanup.
- Dependencies must be installed/resolved before launching preview.
- Preview-only tasks: do not redesign, refactor, rewrite, or modify source without explicit permission.
- VR project integration is deferred until explicitly requested.
- If startup fails, surface exact error and cause rather than attempting fixes.

## Open questions & assumptions

- Exact meaning/domain of "Frags" (fragmentation vs. flame/combustion data) is unconfirmed.
- Integration plan and touchpoints for the VR project are undefined.
- Production deployment target and environment are unknown.
- Dependency manager (npm vs. yarn/pnpm) not yet confirmed; assumed npm.