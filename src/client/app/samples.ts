export type SampleId =
  | "source"
  | "luminance"
  | "grid"
  | "dot-field"
  | "halftone-core"
  | "halftone-corrected"
  | "color-halftone"
  | "imperfections"
  | "comparison";

export type DebugMode =
  | "final"
  | "uv"
  | "luminance"
  | "grid"
  | "red"
  | "green"
  | "blue";

export type ParamKey =
  | "cellSize"
  | "radiusScale"
  | "contrast"
  | "softness"
  | "rotation"
  | "channelOffset"
  | "jitter"
  | "inkSoftness"
  | "noiseAmount"
  | "screenSpaceMix";

export type Params = Record<ParamKey, number>;

export type ControlDefinition = {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

export type PresetDefinition = {
  label: string;
  values: Partial<Params>;
};

export type SampleDefinition = {
  id: SampleId;
  shaderMode: number;
  title: string;
  description: string;
  notes: string[];
  controls: ControlDefinition[];
  defaults: Partial<Params>;
  debugModes: DebugMode[];
  presets: PresetDefinition[];
};

export type SourceImage = {
  id: string;
  label: string;
  url: string;
};

export const debugLabels: Record<DebugMode, string> = {
  final: "Final output",
  uv: "UV coordinates",
  luminance: "Luminance",
  grid: "Grid overlay",
  red: "Red channel",
  green: "Green channel",
  blue: "Blue channel"
};

export const baseParams: Params = {
  cellSize: 48,
  radiusScale: 0.95,
  contrast: 1.15,
  softness: 0.1,
  rotation: 0,
  channelOffset: 0.12,
  jitter: 0.18,
  inkSoftness: 0.16,
  noiseAmount: 0.14,
  screenSpaceMix: 0
};

const controlLibrary: Record<ParamKey, ControlDefinition> = {
  cellSize: {
    key: "cellSize",
    label: "Cell density",
    min: 8,
    max: 140,
    step: 1,
    hint: "Higher values create smaller 2D halftone cells."
  },
  radiusScale: {
    key: "radiusScale",
    label: "Dot scale",
    min: 0.3,
    max: 1.4,
    step: 0.01,
    hint: "Controls how much of each cell the dot can occupy."
  },
  contrast: {
    key: "contrast",
    label: "Darkness curve",
    min: 0.35,
    max: 2.4,
    step: 0.01,
    hint: "Shapes how aggressively luminance becomes dot radius."
  },
  softness: {
    key: "softness",
    label: "Edge softness",
    min: 0.005,
    max: 0.35,
    step: 0.001,
    hint: "Softens dot edges and reduces harsh aliasing."
  },
  rotation: {
    key: "rotation",
    label: "Screen rotation",
    min: -1.57,
    max: 1.57,
    step: 0.01,
    hint: "Rotates the underlying 2D screen pattern."
  },
  channelOffset: {
    key: "channelOffset",
    label: "Channel separation",
    min: 0,
    max: 0.45,
    step: 0.005,
    hint: "Offsets the RGB screens so color halftone structure becomes visible."
  },
  jitter: {
    key: "jitter",
    label: "Cell jitter",
    min: 0,
    max: 0.45,
    step: 0.005,
    hint: "Adds stable per-cell position variation."
  },
  inkSoftness: {
    key: "inkSoftness",
    label: "Ink spread",
    min: 0,
    max: 0.5,
    step: 0.005,
    hint: "Adds soft print-like bloom around the dots."
  },
  noiseAmount: {
    key: "noiseAmount",
    label: "Paper variation",
    min: 0,
    max: 0.45,
    step: 0.005,
    hint: "Modulates the background and dot field with structured noise."
  },
  screenSpaceMix: {
    key: "screenSpaceMix",
    label: "Screen-space mix",
    min: 0,
    max: 1,
    step: 0.01,
    hint: "Compares image-space halftone against screen-space overlay behavior."
  }
};

const controls = (...keys: ParamKey[]) => keys.map((key) => controlLibrary[key]);

export const sourceImages: SourceImage[] = [
  {
    id: "portrait-study",
    label: "Portrait study",
    url: "/public/images/portrait-study.svg"
  },
  {
    id: "geometry-study",
    label: "Geometry study",
    url: "/public/images/geometry-study.svg"
  }
];

export const samples: SampleDefinition[] = [
  {
    id: "source",
    shaderMode: 0,
    title: "Source image",
    description:
      "Start with the image itself. The purpose of this stage is to inspect what the halftone process must preserve before any stylization begins.",
    notes: [
      "Look for large contrast transitions and small details. They determine how readable the later dot field will be.",
      "Notice how aspect ratio and framing already matter before the shader starts doing any pattern work."
    ],
    controls: [],
    defaults: {},
    debugModes: ["final", "uv", "red", "green", "blue"],
    presets: [{ label: "Reference view", values: {} }]
  },
  {
    id: "luminance",
    shaderMode: 1,
    title: "Luminance",
    description:
      "Halftone starts by turning image brightness into a control signal. This stage shows how the source image collapses into grayscale information.",
    notes: [
      "Use the red, green, and blue debug views to compare channel energy against the luminance output.",
      "If the luminance read feels wrong, every later dot decision will be wrong too."
    ],
    controls: controls("contrast"),
    defaults: { contrast: 1 },
    debugModes: ["final", "luminance", "red", "green", "blue", "uv"],
    presets: [
      { label: "Neutral grayscale", values: { contrast: 1 } },
      { label: "High tonal punch", values: { contrast: 1.45 } }
    ]
  },
  {
    id: "grid",
    shaderMode: 2,
    title: "2D grid",
    description:
      "Before dots exist, the screen is just a repeated 2D cell structure. This stage exposes the underlying lattice that the halftone will inhabit.",
    notes: [
      "The grid is the print structure. It should feel regular and inspectable, not accidental.",
      "Compare UV debug and grid debug to understand how the pattern sits in image space."
    ],
    controls: controls("cellSize", "rotation"),
    defaults: { cellSize: 28, rotation: 0.1 },
    debugModes: ["final", "grid", "uv"],
    presets: [
      { label: "Wide cells", values: { cellSize: 18, rotation: 0 } },
      { label: "Denser screen", values: { cellSize: 42, rotation: 0.18 } }
    ]
  },
  {
    id: "dot-field",
    shaderMode: 3,
    title: "Dot field",
    description:
      "Each dot is just distance-to-center inside a repeated cell. This stage isolates the procedural dot construction without image-driven radius changes.",
    notes: [
      "Watch how edge softness changes the feel of the dot without changing the core construction.",
      "This stage should look stable even before luminance is involved."
    ],
    controls: controls("cellSize", "radiusScale", "softness", "rotation"),
    defaults: { cellSize: 34, radiusScale: 0.8, softness: 0.06, rotation: 0.08 },
    debugModes: ["final", "grid", "uv"],
    presets: [
      { label: "Hard print", values: { softness: 0.02, radiusScale: 0.75 } },
      { label: "Soft print", values: { softness: 0.14, radiusScale: 0.92 } }
    ]
  },
  {
    id: "halftone-core",
    shaderMode: 4,
    title: "Halftone core",
    description:
      "Brightness now controls dot radius. Dark areas grow, bright areas recede, and the image begins to read as grayscale halftone.",
    notes: [
      "The key relationship here is luminance to dot radius. Invert it accidentally and the image collapses.",
      "Cell density and radius scale interact strongly. Change one at a time."
    ],
    controls: controls("cellSize", "radiusScale", "contrast", "softness"),
    defaults: { cellSize: 48, radiusScale: 0.98, contrast: 1.2, softness: 0.08 },
    debugModes: ["final", "luminance", "grid", "uv"],
    presets: [
      {
        label: "Classic grayscale",
        values: { cellSize: 46, radiusScale: 1, contrast: 1.15, softness: 0.08 }
      },
      {
        label: "Graphic punch",
        values: { cellSize: 56, radiusScale: 1.12, contrast: 1.6, softness: 0.03 }
      }
    ]
  },
  {
    id: "halftone-corrected",
    shaderMode: 5,
    title: "Corrected halftone",
    description:
      "This stage keeps the halftone tied to image-space UVs and exposes how screen-space coordinates distort the effect when mixed in.",
    notes: [
      "Use screen-space mix to prove to yourself why image-space is the correct default for this study.",
      "Resize the canvas. The corrected version should keep its structure under layout changes."
    ],
    controls: controls("cellSize", "radiusScale", "contrast", "softness", "rotation", "screenSpaceMix"),
    defaults: {
      cellSize: 52,
      radiusScale: 1,
      contrast: 1.25,
      softness: 0.08,
      rotation: 0.18,
      screenSpaceMix: 0
    },
    debugModes: ["final", "grid", "uv", "luminance"],
    presets: [
      { label: "Image-space correct", values: { screenSpaceMix: 0, rotation: 0.18 } },
      { label: "Screen-space drift", values: { screenSpaceMix: 1, rotation: 0.18 } }
    ]
  },
  {
    id: "color-halftone",
    shaderMode: 6,
    title: "Color halftone",
    description:
      "Color halftone emerges by separating the image channels into their own dot screens and recombining them in one image-space composition.",
    notes: [
      "This stays in RGB to match browser image data and keep the concept readable.",
      "Use channel separation and debug modes to inspect why moire-like interactions begin to appear."
    ],
    controls: controls("cellSize", "radiusScale", "contrast", "softness", "rotation", "channelOffset"),
    defaults: {
      cellSize: 54,
      radiusScale: 1,
      contrast: 1.15,
      softness: 0.06,
      rotation: 0.22,
      channelOffset: 0.12
    },
    debugModes: ["final", "red", "green", "blue", "grid", "uv"],
    presets: [
      { label: "Tight channels", values: { channelOffset: 0.06, rotation: 0.16 } },
      { label: "Loose channels", values: { channelOffset: 0.2, rotation: 0.28 } }
    ]
  },
  {
    id: "imperfections",
    shaderMode: 7,
    title: "Imperfections",
    description:
      "The dots are now made less sterile with stable per-cell jitter, subtle paper variation, and soft ink spread.",
    notes: [
      "Each imperfection should have a readable role. If it only adds chaos, it is a bad control.",
      "Stable per-cell variation is more educational than time-varying noise for this project."
    ],
    controls: controls(
      "cellSize",
      "radiusScale",
      "contrast",
      "softness",
      "rotation",
      "channelOffset",
      "jitter",
      "inkSoftness",
      "noiseAmount"
    ),
    defaults: {
      cellSize: 56,
      radiusScale: 1.04,
      contrast: 1.12,
      softness: 0.08,
      rotation: 0.24,
      channelOffset: 0.14,
      jitter: 0.18,
      inkSoftness: 0.16,
      noiseAmount: 0.14
    },
    debugModes: ["final", "grid", "red", "green", "blue"],
    presets: [
      {
        label: "Subtle press",
        values: { jitter: 0.08, inkSoftness: 0.1, noiseAmount: 0.08 }
      },
      {
        label: "Rough print",
        values: { jitter: 0.26, inkSoftness: 0.24, noiseAmount: 0.22 }
      }
    ]
  },
  {
    id: "comparison",
    shaderMode: 8,
    title: "Comparison",
    description:
      "The final stage keeps the progression visible by splitting the view into source image, luminance, and imperfect color halftone.",
    notes: [
      "This view is the learning payoff: source, control signal, and final screen live next to each other.",
      "Use this stage when tuning the later presets so you never lose sight of the source image."
    ],
    controls: controls(
      "cellSize",
      "radiusScale",
      "contrast",
      "softness",
      "rotation",
      "channelOffset",
      "jitter",
      "inkSoftness",
      "noiseAmount"
    ),
    defaults: {
      cellSize: 56,
      radiusScale: 1,
      contrast: 1.12,
      softness: 0.08,
      rotation: 0.22,
      channelOffset: 0.12,
      jitter: 0.14,
      inkSoftness: 0.18,
      noiseAmount: 0.12
    },
    debugModes: ["final", "uv", "luminance", "grid"],
    presets: [
      { label: "Balanced study", values: {} },
      {
        label: "Sharper comparison",
        values: { contrast: 1.45, softness: 0.04, cellSize: 64 }
      }
    ]
  }
];

export const sampleMap = Object.fromEntries(samples.map((sample) => [sample.id, sample])) as Record<
  SampleId,
  SampleDefinition
>;

export function buildParams(sample: SampleDefinition): Params {
  return {
    ...baseParams,
    ...sample.defaults
  };
}
