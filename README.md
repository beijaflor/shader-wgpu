# shader-wgpu

This repository is a study-and-rebuild project for Maxime Heckel's article, [Shades of Halftone](https://blog.maximeheckel.com/posts/shades-of-halftone/).

The goal is not just to "port the demo." The goal is to understand the article well enough to re-implement its ideas with WebGPU, isolate the important shader concepts, and build a reusable halftone playground that makes the tradeoffs visible.

Stack decisions live in [STACK.md](/Users/shootani/Dropbox/github/shader-wgpu/STACK.md).

## Project Goal

Build a small WebGPU application that recreates the article's core halftone samples and exposes the underlying shader logic clearly enough that each sample can be studied, compared, and extended.

By the end of the project, this repo should let you:

- understand how luminance drives dot size and pattern density,
- understand how UV space, screen space, and aspect ratio affect the result,
- compare grayscale and color halftone approaches,
- reproduce the article's "imperfection" techniques,
- and leave behind a cleaner WebGPU architecture than a one-off translation.

## What The Article Covers

The article moves through a clear progression:

1. Start from the basic halftone idea: convert brightness into circles on a regular grid.
2. Compute luminance from color.
3. Build a dot pattern from UV coordinates.
4. Correct distortion with aspect ratio handling.
5. Layer in color halftone ideas instead of grayscale only.
6. Break the perfect digital look by adding controlled randomness and texture.

That progression should also define this repository's implementation order.

## Repository Strategy

This repo should be built as a sequence of small, independently understandable samples instead of one large final demo.

Recommended sample structure:

- `sample-01-luminance`: display luminance only.
- `sample-02-basic-dots`: convert luminance into a simple halftone dot field.
- `sample-03-grid-control`: expose cell size, dot scale, and threshold shaping.
- `sample-04-aspect-ratio`: fix stretching and coordinate-space mistakes.
- `sample-05-rotated-patterns`: support rotated or offset screens.
- `sample-06-color-halftone`: split channels and reproduce color-screen behavior.
- `sample-07-imperfections`: add noise, jitter, wobble, and print-like artifacts.
- `sample-08-comparison-view`: original image vs shader output vs debug overlays.

This is the right level of granularity because each sample corresponds to one idea from the article and one implementation problem in WebGPU.

## WebGPU Translation Principles

The article is shader-first, but this repository should not become shader spaghetti. Keep a strict separation between:

- app setup: adapter, device, canvas, resize handling,
- render infrastructure: pipelines, bind groups, textures, samplers, uniforms,
- sample logic: WGSL shaders and sample-specific UI state,
- debug tooling: overlays for UVs, luminance, cell boundaries, and channel inspection.

Concrete rules:

- Keep each sample's WGSL shader small and focused.
- Reuse one full-screen triangle render path wherever possible.
- Keep uniforms simple and explicit rather than over-generalizing too early.
- Treat debug visualizations as first-class features, not temporary hacks.

## Deep Plan

### Phase 0: Foundation

Objective: create a stable WebGPU base that makes shader iteration fast.

Deliverables:

- minimal app shell with a single full-screen render pass,
- texture loading for one or more source images,
- resize-aware canvas handling,
- a tiny sample router or sample switcher,
- uniform plumbing for time, resolution, mouse, and sample parameters.

Success criteria:

- a blank WGSL fragment shader renders reliably,
- image textures can be sampled in the fragment shader,
- changing uniforms updates the frame without architectural churn.

### Phase 1: Observability Before Effects

Objective: make the invisible math visible before reproducing the halftone look.

Deliverables:

- luminance debug mode,
- UV debug mode,
- grid debug mode showing cell boundaries,
- aspect-ratio debug mode showing coordinate distortion.

Why this matters:

Most shader bugs in a project like this come from coordinate confusion, not the circle math itself. If the debug views are good, later phases become much easier.

### Phase 2: Grayscale Halftone Core

Objective: reproduce the article's essential grayscale halftone behavior.

Implement:

- luminance calculation from sampled color,
- repeated grid coordinates,
- distance-from-cell-center circle shaping,
- mapping darker values to larger dots,
- controls for grid frequency and dot intensity.

Questions to answer while implementing:

- Should dot radius scale linearly with darkness, or is a shaped curve better?
- Does the pattern look better in UV space or in screen-space pixels?
- Where does aliasing appear first when cell size gets small?

Success criteria:

- a still image clearly reads as a halftone rendering,
- dark areas produce large dots and bright areas produce small dots,
- the effect is stable across resize.

### Phase 3: Coordinate and Pattern Quality

Objective: fix the "looks correct only on one canvas size" class of failures.

Implement:

- aspect-ratio correction,
- explicit choice of image-fit behavior,
- optional pattern rotation,
- optional offsetting of the grid origin,
- anti-aliased circle edges where needed.

This phase matters because an apparently correct shader can still be mathematically wrong if it only works at one resolution.

### Phase 4: Color Halftone

Objective: rebuild the article's color-oriented ideas in a way that makes channel behavior inspectable.

Implement:

- per-channel dot generation,
- independent screen rotations or offsets per channel,
- compositing modes for RGB experimentation,
- a debug view that isolates each channel's dot field.

Decisions to document:

- whether to stay in RGB for clarity or introduce a CMYK-inspired approximation,
- whether each channel should share the same cell frequency,
- how to prevent the result from turning into unreadable moire too early.

Success criteria:

- the color result feels meaningfully different from grayscale,
- channel debug views explain why the final image looks the way it does.

### Phase 5: Imperfections and Print Character

Objective: reproduce the article's less sterile look without making the result arbitrary.

Implement candidate effects one at a time:

- per-cell jitter,
- low-amplitude noise on dot radius,
- subtle offset drift,
- paper-like texture modulation,
- ink spread or softness controls.

Important rule:

Every imperfection should have a reason and a toggle. If an effect cannot be isolated and explained, it is too early to merge into the main sample.

### Phase 6: Study Tool, Not Just Demo

Objective: turn the rebuild into something you can learn from repeatedly.

Add:

- side-by-side comparison modes,
- parameter presets that correspond to article stages,
- an on-screen legend for current controls,
- screenshot capture workflow,
- a short writeup for each sample explaining what changed from the previous one.

This phase turns the repo from "finished experiment" into "reusable learning artifact."

## Proposed Technical Architecture

Keep the first version boring and legible.

Suggested structure:

```text
src/
  app/
  webgpu/
  samples/
    sample-01-luminance/
    sample-02-basic-dots/
    ...
  shaders/
    shared/
  ui/
  assets/
```

Architectural guidance:

- `webgpu/` owns device, context, pipelines, and common render helpers.
- `samples/` own sample-specific uniforms, controls, and shader entry points.
- `shaders/shared/` owns reusable WGSL helpers such as luminance, rotation, random, and signed-distance helpers.
- `ui/` should stay thin; the learning value is in the graphics code, not a complicated control panel framework.

## Implementation Order

Use this exact order unless a concrete technical reason appears:

1. project scaffold and WebGPU render loop,
2. image sampling and fullscreen pass,
3. luminance debug sample,
4. basic halftone dots,
5. aspect-ratio correction,
6. color channel separation,
7. imperfection passes,
8. comparison and study tooling,
9. polish and documentation.

This order minimizes rework because each later stage depends on confidence in the math from the earlier stages.

## Testing And Validation Plan

This project is visual, but that is not an excuse to skip verification.

### Manual validation

For every sample, verify:

- resize behavior,
- high-DPI behavior,
- parameter extremes,
- image aspect-ratio edge cases,
- performance on both simple and noisy source images.

### Automated validation

Add lightweight automated checks as soon as the project scaffold exists:

- linting,
- type checking,
- unit tests for pure math and utility code,
- screenshot or visual-regression tests for stable sample states.

Good visual-regression targets:

- luminance-only frame,
- grayscale halftone with a fixed image and parameters,
- color halftone with fixed channel rotations,
- one imperfect-print preset.

### Definition of done for each sample

A sample is only done when:

- it has a clear goal,
- it has named controls,
- it has at least one debug or comparison mode,
- its behavior is documented in the README or a sample note,
- and its output has been checked visually.

## Commit Strategy

Keep commits small and concept-driven.

Recommended commit sequence pattern:

1. scaffold infrastructure,
2. add one sample,
3. add debug view for that sample,
4. add tests or visual baselines,
5. refine naming or architecture only after behavior is stable.

Avoid these bad commit shapes:

- one commit containing the whole app and all shaders,
- refactor plus new effect plus UI changes bundled together,
- "cleanup" commits with hidden behavior changes.

## Risks To Watch Early

- coordinate-space confusion between texture UVs and screen UVs,
- stretched patterns caused by incomplete aspect handling,
- aliasing when grid frequency increases,
- over-abstraction before the samples stabilize,
- making the final image look interesting while losing explainability.

The last risk is the most important. This repository is for understanding, not just aesthetics.

## Milestone Definition

The repository reaches a strong first milestone when it can do all of the following:

- load an image,
- show the original image,
- show luminance,
- show a correct grayscale halftone,
- show a color halftone variant,
- toggle at least two controlled imperfections,
- and compare modes side by side.

At that point, the project is already useful even if it is not feature-complete.

## Immediate Next Steps

When work begins, the first practical tasks should be:

1. implement the stack described in `STACK.md`,
2. scaffold the smallest WebGPU app that can render a textured fullscreen pass,
3. add one fixed source image,
4. implement luminance debug mode,
5. implement the first grayscale halftone sample,
6. add a screenshot-based validation path.

## Source

Primary reference:

- Maxime Heckel, "Shades of Halftone": https://blog.maximeheckel.com/posts/shades-of-halftone/

This README is intentionally opinionated. If the implementation diverges from the article, document the reason so the repo stays useful as a learning record rather than becoming an untraceable experiment.
