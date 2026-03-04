export const halftoneShader = /* wgsl */ `
struct Uniforms {
  meta0: vec4<f32>,
  meta1: vec4<f32>,
  meta2: vec4<f32>,
  meta3: vec4<f32>,
  meta4: vec4<f32>,
};

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var sourceTexture: texture_2d<f32>;
@group(0) @binding(2) var sourceSampler: sampler;

fn resolution() -> vec2<f32> {
  return max(uniforms.meta0.xy, vec2<f32>(1.0, 1.0));
}

fn texture_size() -> vec2<f32> {
  return max(uniforms.meta0.zw, vec2<f32>(1.0, 1.0));
}

fn sample_mode() -> f32 {
  return uniforms.meta1.w;
}

fn debug_mode() -> f32 {
  return uniforms.meta2.x;
}

fn cell_density() -> f32 {
  return max(uniforms.meta2.y, 1.0);
}

fn radius_scale() -> f32 {
  return max(uniforms.meta2.z, 0.01);
}

fn contrast_curve() -> f32 {
  return max(uniforms.meta2.w, 0.01);
}

fn edge_softness() -> f32 {
  return max(uniforms.meta3.x, 0.001);
}

fn rotation_amount() -> f32 {
  return uniforms.meta3.y;
}

fn channel_offset() -> f32 {
  return uniforms.meta3.z;
}

fn jitter_amount() -> f32 {
  return uniforms.meta3.w;
}

fn ink_softness() -> f32 {
  return uniforms.meta4.x;
}

fn noise_amount() -> f32 {
  return uniforms.meta4.y;
}

fn screen_space_mix() -> f32 {
  return clamp(uniforms.meta4.z, 0.0, 1.0);
}

fn rotate2d(point: vec2<f32>, center: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  let local = point - center;
  return vec2<f32>(local.x * c - local.y * s, local.x * s + local.y * c) + center;
}

fn contain_uv(screen_uv: vec2<f32>) -> vec3<f32> {
  let screen = resolution();
  let tex = texture_size();
  let canvas_aspect = screen.x / screen.y;
  let texture_aspect = tex.x / tex.y;

  var uv = screen_uv;
  var inside = 1.0;

  if (canvas_aspect > texture_aspect) {
    let width = texture_aspect / canvas_aspect;
    let min_x = 0.5 - width * 0.5;
    let max_x = 0.5 + width * 0.5;
    uv.x = (screen_uv.x - min_x) / max(width, 0.0001);
    if (screen_uv.x < min_x || screen_uv.x > max_x) {
      inside = 0.0;
    }
  } else {
    let height = canvas_aspect / texture_aspect;
    let min_y = 0.5 - height * 0.5;
    let max_y = 0.5 + height * 0.5;
    uv.y = (screen_uv.y - min_y) / max(height, 0.0001);
    if (screen_uv.y < min_y || screen_uv.y > max_y) {
      inside = 0.0;
    }
  }

  return vec3<f32>(clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)), inside);
}

fn paper_color() -> vec3<f32> {
  return vec3<f32>(0.969, 0.953, 0.918);
}

fn ink_color() -> vec3<f32> {
  return vec3<f32>(0.116, 0.147, 0.149);
}

fn luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.299, 0.587, 0.114));
}

fn hash21(point: vec2<f32>) -> f32 {
  let h = dot(point, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn hash22(point: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(hash21(point), hash21(point + vec2<f32>(41.2, 17.9)));
}

fn screen_square_uv(screen_uv: vec2<f32>) -> vec2<f32> {
  let screen = resolution();
  let min_dim = max(min(screen.x, screen.y), 1.0);
  return (screen_uv * screen) / min_dim;
}

fn pattern_center() -> vec2<f32> {
  let screen = resolution();
  let min_dim = max(min(screen.x, screen.y), 1.0);
  let screen_center = 0.5 * screen / min_dim;
  return mix(vec2<f32>(0.5, 0.5), screen_center, screen_space_mix());
}

fn pattern_uv(image_uv: vec2<f32>, screen_uv: vec2<f32>, angle: f32, offset: vec2<f32>) -> vec2<f32> {
  let base = mix(image_uv, screen_square_uv(screen_uv), screen_space_mix());
  return rotate2d(base + offset, pattern_center(), angle);
}

fn grid_components(coord: vec2<f32>) -> vec4<f32> {
  let scaled = coord * cell_density();
  let repeated = fract(scaled);
  let centered = repeated - 0.5;
  let cell_id = floor(scaled);
  let dist = length(centered);
  return vec4<f32>(centered, dist, hash21(cell_id));
}

fn grid_line(repeated: vec2<f32>) -> f32 {
  var line = 0.0;
  if (repeated.x < 0.035 || repeated.y < 0.035 || repeated.x > 0.965 || repeated.y > 0.965) {
    line = 1.0;
  }
  return line;
}

fn circle_mask(dist: f32, radius: f32, softness: f32) -> f32 {
  let edge = 0.002 + softness * 0.08;
  return 1.0 - smoothstep(radius, radius + edge, dist);
}

fn dot_radius_from_luminance(lightness: f32, variance: f32) -> f32 {
  let darkness = pow(clamp(1.0 - lightness, 0.0, 1.0), contrast_curve());
  let noisy = darkness + variance;
  return clamp(noisy * 0.48 * radius_scale(), 0.0, 0.485);
}

fn channel_radius(channel: f32, variance: f32) -> f32 {
  let darkness = pow(clamp(1.0 - channel, 0.0, 1.0), contrast_curve());
  return clamp((darkness + variance) * 0.45 * radius_scale(), 0.0, 0.46);
}

fn apply_paper_variation(color: vec3<f32>, image_uv: vec2<f32>) -> vec3<f32> {
  let paper_grain = hash21(floor(image_uv * vec2<f32>(250.0, 320.0)));
  let tint = 1.0 - noise_amount() * 0.16 * paper_grain;
  return color * tint;
}

fn source_sample(image_uv: vec2<f32>) -> vec4<f32> {
  return textureSample(sourceTexture, sourceSampler, image_uv);
}

fn source_rgb(image_uv: vec2<f32>) -> vec3<f32> {
  return source_sample(image_uv).rgb;
}

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOut {
  let positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  let uvs = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(2.0, 0.0),
    vec2<f32>(0.0, 2.0)
  );

  var out: VertexOut;
  out.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
  out.uv = uvs[vertex_index];
  return out;
}

@fragment
fn fragment_main(in: VertexOut) -> @location(0) vec4<f32> {
  let fitted = contain_uv(in.uv);
  let image_uv = fitted.xy;
  let inside = fitted.z > 0.5;
  let debug = debug_mode();
  let paper = paper_color();
  let ink = ink_color();

  if (!inside) {
    return vec4<f32>(paper, 1.0);
  }

  let source = source_rgb(image_uv);
  let lum = luminance(source);

  if (sample_mode() == 0.0) {
    if (debug == 1.0) {
      return vec4<f32>(image_uv, 0.0, 1.0);
    }
    if (debug == 4.0) {
      return vec4<f32>(vec3<f32>(source.r), 1.0);
    }
    if (debug == 5.0) {
      return vec4<f32>(vec3<f32>(source.g), 1.0);
    }
    if (debug == 6.0) {
      return vec4<f32>(vec3<f32>(source.b), 1.0);
    }
    return vec4<f32>(source, 1.0);
  }

  let base_coord = pattern_uv(image_uv, in.uv, rotation_amount(), vec2<f32>(0.0, 0.0));
  let grid = grid_components(base_coord);
  let repeated = fract(base_coord * cell_density());
  let grid_overlay = grid_line(repeated);

  if (sample_mode() == 1.0) {
    if (debug == 4.0) {
      return vec4<f32>(vec3<f32>(source.r), 1.0);
    }
    if (debug == 5.0) {
      return vec4<f32>(vec3<f32>(source.g), 1.0);
    }
    if (debug == 6.0) {
      return vec4<f32>(vec3<f32>(source.b), 1.0);
    }
    if (debug == 1.0) {
      return vec4<f32>(image_uv, 0.0, 1.0);
    }
    let grayscale = vec3<f32>(pow(lum, contrast_curve()));
    return vec4<f32>(grayscale, 1.0);
  }

  if (sample_mode() == 2.0) {
    let field = vec3<f32>(0.91);
    let center_mark = 1.0 - smoothstep(0.035, 0.055, grid.z);
    let color = mix(field, vec3<f32>(0.19, 0.45, 0.48), grid_overlay);
    let highlighted = mix(color, ink, center_mark);
    if (debug == 1.0) {
      return vec4<f32>(image_uv, 0.0, 1.0);
    }
    return vec4<f32>(highlighted, 1.0);
  }

  if (sample_mode() == 3.0) {
    let radius = clamp(0.25 * radius_scale(), 0.02, 0.45);
    let mask = circle_mask(grid.z, radius, edge_softness());
    var color = mix(paper, ink, mask);
    color = mix(color, vec3<f32>(0.18, 0.42, 0.45), grid_overlay * 0.4);
    if (debug == 3.0) {
      color = mix(color, vec3<f32>(0.18, 0.42, 0.45), grid_overlay);
    }
    return vec4<f32>(color, 1.0);
  }

  let sample_four_mix = select(screen_space_mix(), 1.0, sample_mode() == 4.0);
  let halftone_coord = rotate2d(
    mix(image_uv, screen_square_uv(in.uv), sample_four_mix),
    mix(vec2<f32>(0.5, 0.5), pattern_center(), sample_four_mix),
    rotation_amount()
  );
  let core_grid = grid_components(halftone_coord);
  let core_repeated = fract(halftone_coord * cell_density());
  let core_line = grid_line(core_repeated);
  let core_radius = dot_radius_from_luminance(lum, 0.0);
  let core_mask = circle_mask(core_grid.z, core_radius, edge_softness());
  let grayscale_halftone = mix(apply_paper_variation(paper, image_uv), ink, core_mask);

  if (sample_mode() == 4.0) {
    if (debug == 2.0) {
      return vec4<f32>(vec3<f32>(lum), 1.0);
    }
    if (debug == 3.0) {
      let color = mix(grayscale_halftone, vec3<f32>(0.18, 0.42, 0.45), core_line);
      return vec4<f32>(color, 1.0);
    }
    if (debug == 1.0) {
      return vec4<f32>(image_uv, 0.0, 1.0);
    }
    return vec4<f32>(grayscale_halftone, 1.0);
  }

  if (sample_mode() == 5.0) {
    if (debug == 1.0) {
      return vec4<f32>(image_uv, 0.0, 1.0);
    }
    if (debug == 2.0) {
      return vec4<f32>(vec3<f32>(lum), 1.0);
    }
    if (debug == 3.0) {
      let overlay = mix(grayscale_halftone, vec3<f32>(0.18, 0.42, 0.45), core_line);
      return vec4<f32>(overlay, 1.0);
    }
    return vec4<f32>(grayscale_halftone, 1.0);
  }

  let offset_scale = channel_offset() * 0.35;
  let red_coord = pattern_uv(image_uv, in.uv, rotation_amount(), vec2<f32>(offset_scale, 0.0));
  let green_coord = pattern_uv(image_uv, in.uv, -rotation_amount() * 0.65, vec2<f32>(-offset_scale, offset_scale * 0.35));
  let blue_coord = pattern_uv(image_uv, in.uv, rotation_amount() * 0.4, vec2<f32>(0.0, -offset_scale));

  var red_grid = grid_components(red_coord);
  var green_grid = grid_components(green_coord);
  var blue_grid = grid_components(blue_coord);

  if (sample_mode() >= 7.0) {
    let red_jitter = (hash22(floor(red_coord * cell_density())) - vec2<f32>(0.5, 0.5)) * jitter_amount() * 0.4;
    let green_jitter = (hash22(floor(green_coord * cell_density())) - vec2<f32>(0.5, 0.5)) * jitter_amount() * 0.4;
    let blue_jitter = (hash22(floor(blue_coord * cell_density())) - vec2<f32>(0.5, 0.5)) * jitter_amount() * 0.4;
    red_grid = grid_components(red_coord + red_jitter);
    green_grid = grid_components(green_coord + green_jitter);
    blue_grid = grid_components(blue_coord + blue_jitter);
  }

  var variance = 0.0;
  if (sample_mode() >= 7.0) {
    variance = noise_amount() * 0.18;
  }
  let red_radius = channel_radius(source.r, (red_grid.w - 0.5) * variance);
  let green_radius = channel_radius(source.g, (green_grid.w - 0.5) * variance);
  let blue_radius = channel_radius(source.b, (blue_grid.w - 0.5) * variance);
  let spread = if (sample_mode() >= 7.0) { ink_softness() } else { 0.0 };
  let red_mask = circle_mask(red_grid.z, red_radius, edge_softness() + spread * 0.6);
  let green_mask = circle_mask(green_grid.z, green_radius, edge_softness() + spread * 0.6);
  let blue_mask = circle_mask(blue_grid.z, blue_radius, edge_softness() + spread * 0.6);

  if (sample_mode() == 6.0 || sample_mode() == 7.0) {
    if (debug == 4.0) {
      return vec4<f32>(vec3<f32>(red_mask), 1.0);
    }
    if (debug == 5.0) {
      return vec4<f32>(vec3<f32>(green_mask), 1.0);
    }
    if (debug == 6.0) {
      return vec4<f32>(vec3<f32>(blue_mask), 1.0);
    }
    if (debug == 3.0) {
      let line_mix = max(grid_line(fract(red_coord * cell_density())), max(grid_line(fract(green_coord * cell_density())), grid_line(fract(blue_coord * cell_density()))));
      let overlay = mix(paper, vec3<f32>(0.18, 0.42, 0.45), line_mix);
      return vec4<f32>(overlay, 1.0);
    }

    var color = paper;
    color *= vec3<f32>(1.0 - red_mask, 1.0 - green_mask, 1.0 - blue_mask);

    if (sample_mode() == 7.0) {
      color = apply_paper_variation(color, image_uv);
      let ink_noise = hash21(floor(image_uv * vec2<f32>(320.0, 190.0)));
      color = mix(color, color * (0.94 - ink_softness() * 0.1), ink_noise * noise_amount());
    }

    return vec4<f32>(color, 1.0);
  }

  let imperfect_color = apply_paper_variation(
    paper * vec3<f32>(1.0 - red_mask, 1.0 - green_mask, 1.0 - blue_mask),
    image_uv
  );
  let source_panel = source;
  let luminance_panel = vec3<f32>(lum);
  var comparison_color = imperfect_color;

  if (in.uv.x < 0.3333) {
    comparison_color = source_panel;
  } else if (in.uv.x < 0.6666) {
    comparison_color = luminance_panel;
  }

  let divider = select(0.0, 1.0, abs(in.uv.x - 0.3333) < 0.003 || abs(in.uv.x - 0.6666) < 0.003);
  comparison_color = mix(comparison_color, vec3<f32>(0.18, 0.42, 0.45), divider);

  if (debug == 2.0) {
    return vec4<f32>(vec3<f32>(lum), 1.0);
  }
  if (debug == 1.0) {
    return vec4<f32>(image_uv, 0.0, 1.0);
  }
  if (debug == 3.0) {
    let line_mix = max(grid_line(fract(red_coord * cell_density())), max(grid_line(fract(green_coord * cell_density())), grid_line(fract(blue_coord * cell_density()))));
    return vec4<f32>(mix(paper, vec3<f32>(0.18, 0.42, 0.45), line_mix), 1.0);
  }

  return vec4<f32>(comparison_color, 1.0);
}
`;
