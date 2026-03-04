# TASKS.md

This file is the practical learning checklist for this repository.

The rule for this project is simple:

- do not leave a learning stage as "looks fine for now",
- complete each stage until you can explain it clearly,
- and only then move to the next stage.

The page already contains the stage order. This file tells you how to study and improve each stage step by step.

## How To Use This File

For every stage below:

1. Read the explanation on the page.
2. Look at the canvas output.
3. Read the corresponding code on the right.
4. Answer the study questions in your own words.
5. Verify the completion criteria.
6. Only then move forward.

If a stage is visually interesting but you cannot explain it, the stage is not done.

## Global Progress Rules

- Keep one small goal at a time.
- Prefer understanding over adding features.
- Do not tune many variables at once.
- Compare current output to the source article constantly.
- If something looks wrong, find whether the problem is:
  - image sampling,
  - coordinate space,
  - repeated grid math,
  - radius mapping,
  - or compositing.

## Short Master Checklist

- [ ] Understand the source image stage.
- [ ] Understand luminance as the control signal.
- [ ] Understand repeated 2D grid math.
- [ ] Understand how distance creates a circular dot.
- [ ] Understand brightness-to-radius mapping.
- [ ] Understand image-space versus screen-space behavior.
- [ ] Understand RGB channel separation for color halftone.
- [ ] Understand controlled imperfections.
- [ ] Understand the final comparison view as a study tool.
- [ ] Tighten the implementation against the source article.
- [ ] Add verification so future shader changes stay trustworthy.

## Stage 1: Source Image

Purpose:

- Trust the image loading and sampling path.
- Understand what visual information the halftone process must preserve.

### Study steps

- [ ] Open the first stage and inspect the image without thinking about the effect yet.
- [ ] Identify the darkest areas, brightest areas, and important edges.
- [ ] Identify where fine detail exists and where large smooth gradients exist.
- [ ] Look at the code excerpt and confirm it is only sampling and displaying the image.
- [ ] Compare the portrait image and geometry image and note how each one may respond differently to halftone.

### Questions you should be able to answer

- What image regions are most important for readability after halftone?
- Which image has stronger large-scale contrast?
- Which image is likely to survive coarse cell sizes better?

### Completion criteria

- [ ] You can explain why the chosen source image matters.
- [ ] You can point to the parts of the image that will stress the shader later.
- [ ] You trust that the image path itself is correct.

## Stage 2: Luminance

Purpose:

- Learn that halftone begins with brightness, not with dots.

### Study steps

- [ ] Compare the source image stage against the luminance stage.
- [ ] Identify which details become clearer and which details become flatter in grayscale.
- [ ] Read the luminance code and confirm how RGB becomes a single value.
- [ ] Note how the contrast curve changes tonal separation.
- [ ] Write one sentence explaining why luminance is the bridge to halftone.

### Questions you should be able to answer

- Why does halftone need a brightness signal?
- What happens if the luminance interpretation is wrong?
- How does the contrast curve affect later dot sizing?

### Completion criteria

- [ ] You can explain luminance without using vague words like "shader magic".
- [ ] You understand why luminance comes before grid and dot logic.
- [ ] You can describe the effect of raising or lowering contrast.

## Stage 3: 2D Grid

Purpose:

- Understand the repeated cell structure that the dots will live inside.

### Study steps

- [ ] Look at the grid stage until you can visually see the repeated lattice.
- [ ] Read the code using `fract`, `floor`, and centered coordinates.
- [ ] Explain the difference between local cell coordinates and global cell identity.
- [ ] Identify how changing cell density would affect image readability later.
- [ ] Compare this stage mentally against real print screens and regular image processing.

### Questions you should be able to answer

- Why does halftone need a regular cell structure?
- What does `fract` give you that `floor` does not?
- Why is cell-centered distance useful later?

### Completion criteria

- [ ] You can explain the grid as repeated local space.
- [ ] You can explain why the grid is the print structure.
- [ ] You understand how denser cells change the study problem.

## Stage 4: Dot Field

Purpose:

- Learn how a circular dot is made procedurally inside a cell.

### Study steps

- [ ] Study the dot field before any image-driven radius is involved.
- [ ] Read the circle mask code carefully.
- [ ] Explain why distance-to-center is enough to define a circle.
- [ ] Compare a hard edge versus a softened edge in terms of appearance and aliasing.
- [ ] Write down the exact role of `smoothstep` here.

### Questions you should be able to answer

- Why is a dot just a thresholded distance field?
- What visual role does softness play?
- Why is this stage easier to debug than full halftone?

### Completion criteria

- [ ] You can explain the dot mathematically.
- [ ] You understand why this stage must be correct before adding luminance.
- [ ] You can describe the tradeoff between hard and soft edges.

## Stage 5: Halftone Core

Purpose:

- Connect brightness to dot radius and create the first true grayscale halftone.

### Study steps

- [ ] Compare the luminance stage and halftone core stage side by side in your mind.
- [ ] Read the code that maps `1 - lightness` into radius.
- [ ] Confirm that darker values produce larger dots and brighter values produce smaller dots.
- [ ] Identify where the image reads well and where the effect begins to fail.
- [ ] Note how cell density and radius scale interact.

### Questions you should be able to answer

- Why is darkness, not brightness, used for radius growth?
- What happens if the mapping is inverted?
- Why do radius scale and cell density need to be studied separately?

### Completion criteria

- [ ] You can explain the brightness-to-radius mapping clearly.
- [ ] You can identify which parameter changes tone versus structure.
- [ ] You can describe what makes this stage read as halftone rather than just circles.

## Stage 6: Corrected Halftone

Purpose:

- Learn why coordinate space and aspect ratio determine correctness.

### Study steps

- [ ] Read the pattern coordinate code carefully.
- [ ] Explain the difference between image-space UV and screen-space behavior.
- [ ] Resize the page and observe whether the stage still feels stable.
- [ ] Compare the corrected stage to the earlier halftone stage.
- [ ] Write down why image-space is the default for this project.

### Questions you should be able to answer

- Why can a shader look correct at one size and still be wrong?
- What is the practical difference between image-space and screen-space patterns?
- Why does this stage belong before color halftone?

### Completion criteria

- [ ] You can explain coordinate-space choice in practical terms.
- [ ] You can spot distortion caused by the wrong reference space.
- [ ] You understand why this stage protects every later stage.

## Stage 7: Color Halftone

Purpose:

- Understand color halftone as separate channel screens, not just tinted grayscale dots.

### Study steps

- [ ] Read the code that builds red, green, and blue coordinates separately.
- [ ] Compare this stage against grayscale halftone and list what visually changes.
- [ ] Explain why each channel can have its own offset or rotation.
- [ ] Observe where color interference begins to appear.
- [ ] Write down why this repo stays in RGB first instead of jumping to CMYK.

### Questions you should be able to answer

- Why is color halftone a structural change, not a color filter?
- What causes moire-like interactions?
- Why is RGB the right first teaching model here?

### Completion criteria

- [ ] You can explain per-channel screens.
- [ ] You understand why color halftone is more complex than grayscale.
- [ ] You can identify what channel separation contributes visually.

## Stage 8: Imperfections

Purpose:

- Learn how to add print character without losing explainability.

### Study steps

- [ ] Read the code for jitter, paper variation, and ink spread.
- [ ] For each imperfection, write one sentence about its role.
- [ ] Separate "useful print feel" from "random noise".
- [ ] Check whether each imperfection appears stable rather than chaotic.
- [ ] Decide which imperfection is most valuable and which is least justified.

### Questions you should be able to answer

- Why is stable per-cell variation better than arbitrary randomness here?
- What does paper variation do differently from dot jitter?
- When does imperfection stop helping readability?

### Completion criteria

- [ ] You can explain every imperfection individually.
- [ ] You can justify why each imperfection exists.
- [ ] You can identify if any current imperfection should be reduced or removed.

## Stage 9: Comparison

Purpose:

- Use the final split view as a learning surface, not just a wrap-up demo.

### Study steps

- [ ] Read the split-view code and confirm how the panels are composed.
- [ ] Compare source image, luminance, and final output as one pipeline.
- [ ] Identify where information is lost and where structure is gained.
- [ ] Use this stage as the summary of the whole repo.
- [ ] Write a short explanation of the complete halftone pipeline from top to bottom.

### Questions you should be able to answer

- What is preserved from the source image?
- What is intentionally transformed by the halftone process?
- Which earlier stage becomes easiest to appreciate in the comparison view?

### Completion criteria

- [ ] You can narrate the full process from source image to imperfect halftone.
- [ ] You can use the comparison view to debug regressions.
- [ ] You understand why the repo is a study document, not only a demo.

## Implementation Improvement Tasks

These are the concrete development tasks after you complete the first learning pass.

### Article alignment

- [ ] Compare each stage against the source article and record differences.
- [ ] Decide which differences are intentional and which are implementation gaps.
- [ ] Adjust stage descriptions so they match the actual output precisely.
- [ ] Tighten the shader until the visual progression matches the article more closely.

### Code clarity

- [ ] Replace any code excerpt that feels too curated or too simplified.
- [ ] Consider linking each stage to exact helper functions in the WGSL source.
- [ ] Reduce any duplicated shader logic once the learning value is preserved.
- [ ] Keep the shader readable even if it means less abstraction.

### Study quality

- [ ] Improve any stage where the explanation and the visual output do not line up.
- [ ] Add short "common mistake" notes for the most error-prone stages.
- [ ] Add one short summary paragraph at the end of the page explaining the full pipeline.
- [ ] Check the document on both desktop and mobile.

### Verification

- [ ] Add `npm run check` to your regular workflow before shader changes are committed.
- [ ] Add at least one automated smoke test for the build or server.
- [ ] Add visual regression coverage for key fixed stages:
  - source image
  - luminance
  - halftone core
  - corrected halftone
  - color halftone
  - comparison

## Suggested Working Order

Use this order for future work:

1. complete the learning checklist from Stage 1 through Stage 9,
2. write down what still feels unclear,
3. refine the shader or explanations only where the understanding is weak,
4. compare against the source article again,
5. add verification so the document stays stable.

## Definition Of Progress

You are making real progress only when at least one of these becomes stronger:

- your explanation of the stage becomes clearer,
- the visual output matches the stage description better,
- the code becomes easier to connect to the image,
- or the implementation gets closer to the source article.

If none of those improve, you are probably just rearranging details.
