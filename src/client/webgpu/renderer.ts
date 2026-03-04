import { halftoneShader } from "../shaders/halftone.js";
import type { DebugMode, Params, SampleDefinition, SourceImage } from "../app/samples.js";

export type RendererState = {
  sample: SampleDefinition;
  debugMode: DebugMode;
  params: Params;
};

type SharedRendererResources = {
  device: GPUDevice;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
  sampler: GPUSampler;
};

const DEBUG_MODE_MAP: Record<DebugMode, number> = {
  final: 0,
  uv: 1,
  luminance: 2,
  grid: 3,
  red: 4,
  green: 5,
  blue: 6
};

const UNIFORM_FLOATS = 20;

export class HalftoneRenderer {
  static #sharedResourcesPromise: Promise<SharedRendererResources> | null = null;

  readonly #canvas: HTMLCanvasElement;
  readonly #device: GPUDevice;
  readonly #context: GPUCanvasContext;
  readonly #format: GPUTextureFormat;
  readonly #pipeline: GPURenderPipeline;
  readonly #sampler: GPUSampler;
  readonly #uniformBuffer: GPUBuffer;

  #bindGroup: GPUBindGroup | null = null;
  #texture: GPUTexture | null = null;
  #textureSize = { width: 1, height: 1 };
  #sourceUrl = "";
  #state: RendererState;
  #startTime = performance.now();
  #pointer = { x: 0.5, y: 0.5 };
  #frameHandle = 0;

  static async create(
    canvas: HTMLCanvasElement,
    initialState: RendererState,
    source: SourceImage
  ): Promise<HalftoneRenderer> {
    const shared = await HalftoneRenderer.getSharedResources();
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("The canvas could not create a WebGPU context.");
    }
    context.configure({
      device: shared.device,
      format: shared.format,
      alphaMode: "premultiplied"
    });

    const uniformBuffer = shared.device.createBuffer({
      label: "scene-uniforms",
      size: UNIFORM_FLOATS * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const renderer = new HalftoneRenderer(
      canvas,
      shared.device,
      context,
      shared.format,
      shared.pipeline,
      shared.sampler,
      uniformBuffer,
      initialState
    );

    await renderer.setSource(source);
    renderer.start();
    return renderer;
  }

  private constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    pipeline: GPURenderPipeline,
    sampler: GPUSampler,
    uniformBuffer: GPUBuffer,
    initialState: RendererState
  ) {
    this.#canvas = canvas;
    this.#device = device;
    this.#context = context;
    this.#format = format;
    this.#pipeline = pipeline;
    this.#sampler = sampler;
    this.#uniformBuffer = uniformBuffer;
    this.#state = initialState;
  }

  private static async getSharedResources(): Promise<SharedRendererResources> {
    if (!HalftoneRenderer.#sharedResourcesPromise) {
      HalftoneRenderer.#sharedResourcesPromise = (async () => {
        if (!("gpu" in navigator)) {
          throw new Error("This browser does not expose navigator.gpu. Use a WebGPU-capable browser such as Chrome or Edge.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          throw new Error("WebGPU adapter request failed. A compatible GPU adapter was not found.");
        }

        const device = await adapter.requestDevice();
        const format = navigator.gpu.getPreferredCanvasFormat();
        const shaderModule = device.createShaderModule({
          label: "halftone-shader",
          code: halftoneShader
        });

        const pipeline = device.createRenderPipeline({
          label: "halftone-pipeline",
          layout: "auto",
          vertex: {
            module: shaderModule,
            entryPoint: "vertex_main"
          },
          fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [{ format }]
          },
          primitive: {
            topology: "triangle-list"
          }
        });

        const sampler = device.createSampler({
          magFilter: "linear",
          minFilter: "linear"
        });

        return {
          device,
          format,
          pipeline,
          sampler
        };
      })();
    }

    return HalftoneRenderer.#sharedResourcesPromise;
  }

  update(nextState: RendererState): void {
    this.#state = nextState;
  }

  updatePointer(clientX: number, clientY: number): void {
    const rect = this.#canvas.getBoundingClientRect();
    this.#pointer = {
      x: rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5,
      y: rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5
    };
  }

  async setSource(source: SourceImage): Promise<void> {
    if (source.url === this.#sourceUrl && this.#bindGroup) {
      return;
    }

    this.#sourceUrl = source.url;
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to load source image: ${source.url}`);
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: "default" });
    const texture = this.#device.createTexture({
      label: `source-texture:${source.id}`,
      size: {
        width: bitmap.width,
        height: bitmap.height
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.#device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      { width: bitmap.width, height: bitmap.height }
    );
    bitmap.close();

    this.#texture?.destroy();
    this.#texture = texture;
    this.#textureSize = { width: bitmap.width, height: bitmap.height };
    this.#bindGroup = this.#device.createBindGroup({
      label: "scene-bind-group",
      layout: this.#pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.#uniformBuffer } },
        { binding: 1, resource: this.#texture.createView() },
        { binding: 2, resource: this.#sampler }
      ]
    });
  }

  start(): void {
    const frame = () => {
      this.#frameHandle = requestAnimationFrame(frame);
      this.render();
    };

    if (this.#frameHandle === 0) {
      frame();
    }
  }

  dispose(): void {
    if (this.#frameHandle) {
      cancelAnimationFrame(this.#frameHandle);
      this.#frameHandle = 0;
    }
    this.#texture?.destroy();
  }

  private resizeCanvasToDisplaySize(): void {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(1, Math.round(this.#canvas.clientWidth * dpr));
    const displayHeight = Math.max(1, Math.round(this.#canvas.clientHeight * dpr));

    if (this.#canvas.width !== displayWidth || this.#canvas.height !== displayHeight) {
      this.#canvas.width = displayWidth;
      this.#canvas.height = displayHeight;
      this.#context.configure({
        device: this.#device,
        format: this.#format,
        alphaMode: "premultiplied"
      });
    }
  }

  private render(): void {
    if (!this.#bindGroup) {
      return;
    }

    this.resizeCanvasToDisplaySize();

    const uniforms = new Float32Array(UNIFORM_FLOATS);
    uniforms[0] = this.#canvas.width;
    uniforms[1] = this.#canvas.height;
    uniforms[2] = this.#textureSize.width;
    uniforms[3] = this.#textureSize.height;
    uniforms[4] = this.#pointer.x;
    uniforms[5] = this.#pointer.y;
    uniforms[6] = (performance.now() - this.#startTime) / 1000;
    uniforms[7] = this.#state.sample.shaderMode;
    uniforms[8] = DEBUG_MODE_MAP[this.#state.debugMode];
    uniforms[9] = this.#state.params.cellSize;
    uniforms[10] = this.#state.params.radiusScale;
    uniforms[11] = this.#state.params.contrast;
    uniforms[12] = this.#state.params.softness;
    uniforms[13] = this.#state.params.rotation;
    uniforms[14] = this.#state.params.channelOffset;
    uniforms[15] = this.#state.params.jitter;
    uniforms[16] = this.#state.params.inkSoftness;
    uniforms[17] = this.#state.params.noiseAmount;
    uniforms[18] = this.#state.params.screenSpaceMix;
    uniforms[19] = 0;
    this.#device.queue.writeBuffer(this.#uniformBuffer, 0, uniforms);

    const commandEncoder = this.#device.createCommandEncoder({
      label: "render-encoder"
    });
    const textureView = this.#context.getCurrentTexture().createView();
    const pass = commandEncoder.beginRenderPass({
      label: "render-pass",
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.97, g: 0.95, b: 0.92, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });

    pass.setPipeline(this.#pipeline);
    pass.setBindGroup(0, this.#bindGroup);
    pass.draw(3);
    pass.end();

    this.#device.queue.submit([commandEncoder.finish()]);
  }
}
