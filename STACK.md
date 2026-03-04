# STACK.md

## Goal Of This Stack

The stack should stay minimal enough that the graphics work remains the center of attention.

This repository is not trying to become:

- a large SPA,
- a component-framework showcase,
- a CSS architecture exercise,
- or a server-rendered web app.

It should be a mostly static WebGPU study page with a very small TypeScript toolchain and a very small Hono server.

## Recommended Stack

### Application Shape

Use a basically static webpage.

That means:

- one HTML entry page,
- one main TypeScript entry for the WebGPU app,
- a small amount of CSS,
- static assets for images and optional WGSL files,
- no frontend framework unless the project later proves it is needed.

This is the correct default for the repository because the core work is shader logic, parameter controls, and visual comparison, not client-side application complexity.

### Styling

Use a classless CSS framework.

Recommended choice: Pico CSS, classless build.

Why Pico:

- it explicitly supports a classless variant,
- it styles semantic HTML directly,
- it stays readable without utility-class noise,
- it is flexible enough for control panels, forms, sliders, and debug text.

Use semantic HTML like:

- `<header>` for title and repo context,
- `<main>` for canvas and controls,
- `<section>` for sample explanations,
- `<footer>` for references and shortcuts.

Minimal custom CSS should still exist for:

- canvas sizing,
- layout around the WebGPU viewport,
- side-by-side comparison panes,
- a compact controls area,
- and any debug overlays that Pico does not naturally style.

### Build Tooling

Use TypeScript plus a minimal bundling strategy.

Recommended default:

- `tsc --noEmit` for type-checking,
- `esbuild` for browser bundling.

Why this is the best fit:

- `tsc` remains the source of truth for type safety,
- `esbuild` is much smaller and simpler than a full app framework toolchain,
- bundling is still useful for browser delivery, asset references, and keeping the app easy to serve,
- this avoids turning the repo into build-tool homework.

### Server

Use a minimal Hono application on Node.js to serve the static output.

Recommended shape:

- Hono app for routing,
- `@hono/node-server` for local serving,
- `serveStatic` for built assets,
- no server-side rendering,
- no database,
- no API until a real need appears.

This server exists for one reason: reliably serve the static site and assets while leaving room for future utilities such as screenshots, preset exports, or asset selection.

## Bundler Options

These are the realistic options for this repository.

### Option A: `tsc` only

Shape:

- write browser-native ES modules in TypeScript,
- compile to JavaScript with `tsc`,
- serve the emitted files directly.

Pros:

- smallest possible toolchain,
- almost nothing to configure,
- forces clarity about what the browser is actually loading.

Cons:

- no real bundling,
- awkward asset handling as the project grows,
- more manual work for WGSL files, CSS organization, and deployment output,
- weaker dev experience once the repo has multiple samples.

Verdict:

Good for a tiny proof of concept. Too bare once the repository becomes a real study tool.

### Option B: `tsc` + `esbuild` (Recommended)

Shape:

- `tsc --noEmit` checks types,
- `esbuild` bundles browser code into `dist/`,
- Hono serves `dist/` and `public/`.

Pros:

- very small and fast,
- explicit and understandable,
- enough bundling for TS, CSS, and browser delivery,
- easier to keep mentally small than Vite.

Cons:

- you build some convenience yourself,
- dev ergonomics are not as polished as Vite,
- advanced asset workflows require deliberate setup.

Verdict:

Best balance for this repo today.

### Option C: Vite

Shape:

- Vite handles dev server and production build,
- TypeScript source compiles through the Vite pipeline,
- Hono can either serve built output or be used separately.

Pros:

- excellent dev experience,
- great static asset handling,
- widely used for browser graphics projects,
- very good fit if the UI becomes richer.

Cons:

- more machinery than this repository currently needs,
- the tooling can become more visible than the learning goal,
- Hono becomes less central during local development.

Verdict:

Strong option if the project grows into a richer playground. Not my first choice for the initial build.

## Final Recommendation

Use this stack first:

- static HTML page,
- TypeScript entrypoint,
- Pico CSS classless build,
- `tsc --noEmit`,
- `esbuild` for bundling,
- minimal Hono Node app for serving static files.

This keeps the repo small, explicit, and close to the browser while still avoiding the pain of a pure `tsc`-only setup.

## Minimal Hono Application Shape

The Hono app should be intentionally small.

Responsibilities:

- serve `dist/` as the built frontend output,
- serve `public/` for source images and any static assets that should remain unhashed,
- return `index.html` for `/`,
- expose a simple health route such as `/health`,
- do nothing else unless a new requirement appears.

Non-responsibilities:

- no template rendering,
- no session handling,
- no API architecture,
- no business logic.

Suggested shape:

```text
src/
  client/
    main.ts
    styles.css
  server/
    index.ts
public/
  images/
dist/
```

Suggested behavior:

- `src/client/` contains the static page logic and WebGPU code,
- `public/` stores learning assets such as source images,
- `dist/` is the build output,
- `src/server/index.ts` is a minimal Hono wrapper around static serving.

## Why Not A Frontend Framework

A framework would add more abstractions than value at the start.

This project's hard problems are:

- shader math,
- render-pipeline structure,
- parameter design,
- and visual debugging.

They are not:

- client-side routing,
- component composition complexity,
- or state synchronization across many views.

If a framework is introduced later, it should solve a real problem such as sample composition, state panels, or preset management. It should not be added by default.

## Styling Options

Recommended: Pico CSS classless build.

Other acceptable options:

- Water.css: even simpler, but less suitable for a structured controls-heavy playground.
- MVP.css: also lightweight, but Pico is the safer fit for forms and more deliberate layout control.

Verdict:

Pico is the best match if the page needs sliders, labels, buttons, and explanatory content without accumulating much custom CSS.

## Testing Awareness For This Stack

Even with a static page, keep verification explicit.

Use:

- `tsc --noEmit` for type correctness,
- a linter once the scaffold exists,
- browser-based smoke testing for WebGPU support and resize handling,
- screenshot or visual-regression checks once sample outputs stabilize.

The server layer should have only a tiny amount of testing because it should contain only a tiny amount of logic.

## Reference Links

- Hono Node.js docs: https://hono.dev/docs/getting-started/nodejs
- Hono static serving on Node: https://hono.dev/docs/getting-started/nodejs
- Pico CSS homepage: https://picocss.com/
- Pico classless docs: https://picocss.com/docs/classless
- Water.css: https://watercss.kognise.dev/
- Vite docs: https://vite.dev/config/
- esbuild docs: https://esbuild.github.io/getting-started/
- TypeScript `tsconfig.json` docs: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
- TypeScript `outDir` / `outFile` reference: https://www.typescriptlang.org/tsconfig/
