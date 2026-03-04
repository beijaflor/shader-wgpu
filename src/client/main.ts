import "@picocss/pico/css/pico.classless.min.css";
import "./styles.css";

import {
  buildParams,
  debugLabels,
  sampleMap,
  samples,
  sourceImages,
  type DebugMode,
  type ParamKey,
  type Params,
  type SampleDefinition,
  type SourceImage
} from "./app/samples.js";
import { HalftoneRenderer, type RendererState } from "./webgpu/renderer.js";

type AppState = {
  sample: SampleDefinition;
  source: SourceImage;
  debugMode: DebugMode;
  params: Params;
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The application shell is missing the required node: ${selector}`);
  }
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>("#halftone-canvas");
const status = requiredElement<HTMLParagraphElement>("#status");
const sampleDescription = requiredElement<HTMLParagraphElement>("#sample-description");
const sampleNotes = requiredElement<HTMLDivElement>("#sample-notes");
const sampleSelect = requiredElement<HTMLSelectElement>("#sample-select");
const debugSelect = requiredElement<HTMLSelectElement>("#debug-select");
const sourceSelect = requiredElement<HTMLSelectElement>("#source-select");
const presetSelect = requiredElement<HTMLSelectElement>("#preset-select");
const controlsForm = requiredElement<HTMLFormElement>("#controls-form");

const initialSample = samples[0];
const initialSource = sourceImages[0];

let state: AppState = {
  sample: initialSample,
  source: initialSource,
  debugMode: "final",
  params: buildParams(initialSample)
};

let renderer: HalftoneRenderer | null = null;

function setStatus(message: string): void {
  status.textContent = message;
}

function createStateSnapshot(): RendererState {
  return {
    sample: state.sample,
    debugMode: state.debugMode,
    params: state.params
  };
}

function renderSampleNotes(sample: SampleDefinition): void {
  sampleDescription.textContent = sample.description;
  sampleNotes.replaceChildren(
    ...sample.notes.map((note, index) => {
      const article = document.createElement("article");
      const heading = document.createElement("h3");
      const paragraph = document.createElement("p");
      heading.textContent = index === 0 ? "Focus" : `Observation ${index}`;
      paragraph.textContent = note;
      article.append(heading, paragraph);
      return article;
    })
  );
}

function buildSelectOptions(
  select: HTMLSelectElement,
  options: { value: string; label: string }[],
  selectedValue: string
): void {
  select.replaceChildren(
    ...options.map((option) => {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      element.selected = option.value === selectedValue;
      return element;
    })
  );
}

function updatePresetSelect(): void {
  buildSelectOptions(
    presetSelect,
    state.sample.presets.map((preset, index) => ({
      value: String(index),
      label: preset.label
    })),
    "0"
  );
}

function applyPreset(index: number): void {
  const preset = state.sample.presets[index];
  if (!preset) {
    return;
  }

  state = {
    ...state,
    params: {
      ...buildParams(state.sample),
      ...preset.values
    }
  };
  renderControls();
  syncRenderer();
}

function renderControls(): void {
  controlsForm.replaceChildren();
  for (const control of state.sample.controls) {
    const wrapper = document.createElement("label");
    wrapper.htmlFor = control.key;

    const title = document.createElement("span");
    title.textContent = control.label;

    const input = document.createElement("input");
    input.type = "range";
    input.id = control.key;
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);
    input.value = String(state.params[control.key]);

    const value = document.createElement("span");
    value.className = "control-value";
    value.textContent = `${state.params[control.key].toFixed(3)} - ${control.hint}`;

    input.addEventListener("input", () => {
      state = {
        ...state,
        params: {
          ...state.params,
          [control.key]: Number(input.value)
        }
      };
      value.textContent = `${state.params[control.key].toFixed(3)} - ${control.hint}`;
      syncRenderer();
    });

    wrapper.append(title, input, value);
    controlsForm.append(wrapper);
  }

  if (state.sample.controls.length === 0) {
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "This stage is observational. Move to the next sample when you understand what the image or signal is contributing.";
    controlsForm.append(paragraph);
  }
}

function renderSelectors(): void {
  buildSelectOptions(
    sampleSelect,
    samples.map((sample) => ({
      value: sample.id,
      label: sample.title
    })),
    state.sample.id
  );

  buildSelectOptions(
    sourceSelect,
    sourceImages.map((source) => ({
      value: source.id,
      label: source.label
    })),
    state.source.id
  );

  buildSelectOptions(
    debugSelect,
    state.sample.debugModes.map((mode) => ({
      value: mode,
      label: debugLabels[mode]
    })),
    state.debugMode
  );

  updatePresetSelect();
}

function refreshUi(): void {
  renderSelectors();
  renderControls();
  renderSampleNotes(state.sample);
}

async function syncRenderer(): Promise<void> {
  if (!renderer) {
    return;
  }
  renderer.update(createStateSnapshot());
}

sampleSelect.addEventListener("change", () => {
  const nextSample = sampleMap[sampleSelect.value as keyof typeof sampleMap];
  state = {
    ...state,
    sample: nextSample,
    debugMode: "final",
    params: buildParams(nextSample)
  };
  refreshUi();
  void syncRenderer();
});

debugSelect.addEventListener("change", () => {
  state = {
    ...state,
    debugMode: debugSelect.value as DebugMode
  };
  void syncRenderer();
});

sourceSelect.addEventListener("change", async () => {
  const nextSource = sourceImages.find((source) => source.id === sourceSelect.value);
  if (!nextSource) {
    return;
  }
  state = {
    ...state,
    source: nextSource
  };
  setStatus(`Loading ${nextSource.label}...`);
  try {
    await renderer?.setSource(nextSource);
    setStatus("WebGPU ready. Resize the canvas or adjust controls to inspect the 2D halftone structure.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Source image failed to load.");
  }
});

presetSelect.addEventListener("change", () => {
  applyPreset(Number(presetSelect.value));
});

canvas.addEventListener("pointermove", (event) => {
  renderer?.updatePointer(event.clientX, event.clientY);
});

canvas.addEventListener("pointerleave", () => {
  renderer?.updatePointer(0, 0);
});

window.addEventListener("beforeunload", () => {
  renderer?.dispose();
});

refreshUi();

try {
  renderer = await HalftoneRenderer.create(canvas, createStateSnapshot(), state.source);
  setStatus("WebGPU ready. Start with the source image, then move into luminance, grid, dots, and halftone stages.");
  await syncRenderer();
} catch (error) {
  setStatus(error instanceof Error ? error.message : "WebGPU initialization failed.");
}
