import "@picocss/pico/css/pico.classless.min.css";
import "./styles.css";

import { buildParams, samples, sourceImages, type Params, type SampleDefinition } from "./app/samples.js";
import { HalftoneRenderer } from "./webgpu/renderer.js";

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The application shell is missing the required node: ${selector}`);
  }
  return element;
}

const pageStatus = requiredElement<HTMLParagraphElement>("#page-status");
const studySections = requiredElement<HTMLDivElement>("#study-sections");
const sampleTemplate = requiredElement<HTMLTemplateElement>("#sample-template");
const source = sourceImages[0];
const renderers: HalftoneRenderer[] = [];

function setPageStatus(message: string): void {
  pageStatus.textContent = message;
}

function notesFragment(notes: string[], firstHeading: string, prefix: string): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const [index, note] of notes.entries()) {
    const article = document.createElement("article");
    const heading = document.createElement(index === 0 ? "h3" : "h3");
    const paragraph = document.createElement("p");
    heading.textContent = index === 0 ? firstHeading : `${prefix} ${index}`;
    paragraph.textContent = note;
    article.append(heading, paragraph);
    fragment.append(article);
  }

  return fragment;
}

function buildFixedParams(sample: SampleDefinition): Params {
  const presetValues = sample.presets[0]?.values ?? {};
  return {
    ...buildParams(sample),
    ...presetValues
  };
}

function renderParameterSummary(container: HTMLElement, sample: SampleDefinition, params: Params): void {
  container.replaceChildren();

  if (sample.controls.length === 0) {
    const article = document.createElement("article");
    const heading = document.createElement("h4");
    const paragraph = document.createElement("p");
    heading.textContent = "Observation stage";
    paragraph.textContent =
      "No live controls are shown here. This stage is fixed so you can focus on the source image or signal before parameter tuning begins.";
    article.append(heading, paragraph);
    container.append(article);
    return;
  }

  for (const control of sample.controls) {
    const article = document.createElement("article");
    const heading = document.createElement("h4");
    const paragraph = document.createElement("p");
    heading.textContent = control.label;
    paragraph.textContent = `${params[control.key].toFixed(3)} - ${control.hint}`;
    article.append(heading, paragraph);
    container.append(article);
  }
}

async function buildSampleSection(sample: SampleDefinition, index: number): Promise<void> {
  const fragment = sampleTemplate.content.cloneNode(true) as DocumentFragment;
  const section = fragment.querySelector<HTMLElement>(".study-stage");
  const title = fragment.querySelector<HTMLHeadingElement>(".sample-title");
  const description = fragment.querySelector<HTMLParagraphElement>(".sample-description");
  const meta = fragment.querySelector<HTMLParagraphElement>(".sample-meta");
  const notes = fragment.querySelector<HTMLDivElement>(".sample-notes");
  const params = fragment.querySelector<HTMLDivElement>(".sample-params");
  const codeTitle = fragment.querySelector<HTMLHeadingElement>(".code-title");
  const code = fragment.querySelector<HTMLElement>(".sample-code");
  const asideNotes = fragment.querySelector<HTMLDivElement>(".sample-aside-notes");
  const canvas = fragment.querySelector<HTMLCanvasElement>(".sample-canvas");
  const kicker = fragment.querySelector<HTMLParagraphElement>(".stage-kicker");

  if (!section || !title || !description || !meta || !notes || !params || !codeTitle || !code || !asideNotes || !canvas || !kicker) {
    throw new Error("The sample template is missing required nodes.");
  }

  const fixedParams = buildFixedParams(sample);
  title.textContent = sample.title;
  description.textContent = sample.description;
  kicker.textContent = `Stage ${index + 1}`;
  meta.textContent = `Fixed source: ${source.label}. Fixed debug view: final output. Fixed preset: ${sample.presets[0]?.label ?? "defaults"}.`;
  notes.append(notesFragment(sample.notes, "Focus", "Observation"));
  renderParameterSummary(params, sample, fixedParams);
  codeTitle.textContent = sample.codeTitle;
  code.textContent = sample.codeSnippet;
  asideNotes.append(notesFragment(sample.asideNotes, "Why it matters", "Study note"));

  studySections.append(fragment);

  const renderer = await HalftoneRenderer.create(
    canvas,
    {
      sample,
      debugMode: "final",
      params: fixedParams
    },
    source
  );
  renderers.push(renderer);
}

window.addEventListener("beforeunload", () => {
  for (const renderer of renderers) {
    renderer.dispose();
  }
});

try {
  setPageStatus("Preparing the static WebGPU study canvases.");
  for (const [index, sample] of samples.entries()) {
    await buildSampleSection(sample, index);
  }
  setPageStatus(`WebGPU ready. Rendering ${samples.length} fixed study stages with the "${source.label}" source image.`);
} catch (error) {
  setPageStatus(error instanceof Error ? error.message : "WebGPU initialization failed.");
}
