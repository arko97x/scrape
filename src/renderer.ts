import { PaintEngine } from './engine';
import { PIGMENT_ABSORPTION } from './material';

const vertex = `#version 300 es
in vec2 position;
out vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }`;

const fragment = `#version 300 es
precision highp float;
uniform sampler2D paint;
uniform vec2 fieldSize;
in vec2 uv;
out vec4 outputColour;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec4 field(vec2 p, out float coverage) {
  vec2 at = clamp(p * fieldSize - .5, vec2(0.), fieldSize - 1.);
  ivec2 cell = ivec2(floor(at));
  ivec2 end = ivec2(fieldSize) - 1;
  vec2 f = fract(at);
  vec4 a = texelFetch(paint, cell, 0);
  vec4 b = texelFetch(paint, min(cell + ivec2(1, 0), end), 0);
  vec4 c = texelFetch(paint, min(cell + ivec2(0, 1), end), 0);
  vec4 d = texelFetch(paint, min(cell + ivec2(1, 1), end), 0);
  // Filter optical coverage before reconstruction. Applying absorption to
  // interpolated height saturated partial edge coverage and exposed the grid.
  float absorption = ${PIGMENT_ABSORPTION.toFixed(1)};
  vec4 alpha = 1. - exp(-vec4(a.a, b.a, c.a, d.a) * absorption);
  coverage = mix(mix(alpha.x, alpha.y, f.x), mix(alpha.z, alpha.w, f.x), f.y);
  // Interpolate pigment weighted by paint height so empty neighbouring cells can't make dark fringes.
  a.rgb *= a.a; b.rgb *= b.a; c.rgb *= c.a; d.rgb *= d.a;
  vec4 result = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  if (result.a > .00001) result.rgb /= result.a;
  return result;
}
vec4 field(vec2 p) { float ignored; return field(p, ignored); }
// Surface tension: thin films keep their true height, but thick paint saturates
// into a pillow with a flat top and steep shoulders instead of a pointed cone.
float surface(float h) { return .12 * (1. - exp(-h / .12)); }
vec4 opticalSample(vec2 p) {
  float coverage; vec4 material = field(p, coverage);
  return vec4(material.rgb * coverage, coverage);
}
void main() {
  vec2 p = vec2(uv.x, 1. - uv.y);
  vec2 px = 1. / fieldSize;
  float opacity;
  vec4 samplePaint = field(p, opacity);
  // A compact reconstruction footprint suppresses one-cell stair steps without
  // changing the material field or blurring its height-driven ridges and sheen.
  vec2 footprint = max(px * .75, fwidth(p) * .5);
  vec4 visual = vec4(samplePaint.rgb * opacity, opacity) * .5 + .125 * (
    opticalSample(p + vec2(footprint.x, 0.)) + opticalSample(p - vec2(footprint.x, 0.)) +
    opticalSample(p + vec2(0., footprint.y)) + opticalSample(p - vec2(0., footprint.y)));
  opacity = visual.a;
  samplePaint.rgb = opacity > .000001 ? visual.rgb / opacity : vec3(0.);
  float grain = hash(floor(p * fieldSize * 2.));
  float fibre = hash(floor(p * fieldSize * vec2(.4, 1.8)));
  vec3 paper = vec3(.964, .950, .905) + (grain - .5) * .033 + (fibre - .5) * .014;
  float h = samplePaint.a;
  float relief = surface(h);
  // Sobel over a 1.5-cell footprint: smooth enough for a rounded dome, still
  // tight enough to keep the scraped ridges crisp.
  vec2 s = px * 1.5;
  float tl = surface(field(p + s * vec2(-1., -1.)).a), tc = surface(field(p + s * vec2(0., -1.)).a), tr = surface(field(p + s * vec2(1., -1.)).a);
  float ml = surface(field(p + s * vec2(-1., 0.)).a), mr = surface(field(p + s * vec2(1., 0.)).a);
  float bl = surface(field(p + s * vec2(-1., 1.)).a), bc = surface(field(p + s * vec2(0., 1.)).a), br = surface(field(p + s * vec2(1., 1.)).a);
  vec2 slope = vec2((tl + 2. * ml + bl) - (tr + 2. * mr + br), (tl + 2. * tc + tr) - (bl + 2. * bc + br));
  vec3 normal = normalize(vec3(slope * 9., 1.));
  // A lowish light so flat tops stay evenly lit and only the shoulders glint.
  vec3 light = normalize(vec3(-.5, -.65, .9));
  vec3 halfway = normalize(light + vec3(0., 0., 1.));
  // 1 on flat paint, below 1 on the shoulder turned away from the light.
  float lit = max(dot(normal, light), 0.) / light.z;
  float facing = max(dot(normal, halfway), 0.);
  // A tight glint on the lit shoulder plus a broad sheen reads as wet acrylic.
  float specular = pow(facing, 60.) * .5 + pow(facing, 9.) * .06;
  // Soft cast shadow: blurred relief sampled toward the light, so raised paint
  // throws a shadow down and to the right onto paper and onto thinner paint.
  vec2 toward = normalize(light.xy) * px;
  float caster = 0.;
  for (int i = 1; i <= 4; i++) {
    vec2 at = p + toward * float(i) * 1.6;
    caster += surface(field(at).a) + .5 * (surface(field(at + vec2(px.x, -px.y) * 1.5).a) + surface(field(at - vec2(px.x, -px.y) * 1.5).a));
  }
  float shadow = max(0., caster / 8. - relief);
  // Opaque pigment still covers paper in a thin scraped film; only depleted tails
  // become translucent. The previous threshold made thin paint look prematurely dry.
  paper *= 1. - min(.14, shadow * 1.4);
  // Shade toward a deeper version of the pigment rather than grey, so yellow
  // turns golden in shadow instead of olive.
  vec3 base = samplePaint.rgb;
  float shade = clamp((1. - lit) * .55 + shadow * 1.2, 0., .6);
  vec3 colour = mix(base, base * base * .9, shade) * (1. + max(0., lit - 1.) * .25);
  colour += vec3(specular * smoothstep(.004, .03, h));
  colour += (grain - .5) * .008;
  outputColour = vec4(mix(paper, colour, opacity), 1.);
}`;

export class PaintRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private buffer: WebGLBuffer;
  private vao: WebGLVertexArrayObject;
  private uploaded = false;
  constructor(readonly canvas: HTMLCanvasElement, private engine: PaintEngine) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('This studio needs WebGL 2. Try a recent browser with graphics acceleration enabled.');
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(`Paint shader could not compile: ${log}`); }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Paint renderer could not start.');
    this.program = program; gl.useProgram(program);
    this.vao = gl.createVertexArray()!; gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    this.texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, engine.width, engine.height, 0, gl.RGBA, gl.FLOAT, engine.pixels);
    gl.uniform1i(gl.getUniformLocation(program, 'paint'), 0);
    gl.uniform2f(gl.getUniformLocation(program, 'fieldSize'), engine.width, engine.height);
  }

  render(force = false) {
    const { gl, engine } = this;
    if (!engine.dirty && this.uploaded && !force) return;
    gl.useProgram(this.program); gl.bindVertexArray(this.vao); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (engine.dirty) {
      const { x, y, right, bottom } = engine.dirty;
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, engine.width);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, right - x, bottom - y, gl.RGBA, gl.FLOAT, engine.pixels, (y * engine.width + x) * 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); engine.dirty = null;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.drawArrays(gl.TRIANGLES, 0, 6); this.uploaded = true;
  }

  async exportPNG() {
    const canvas = document.createElement('canvas'); canvas.width = this.engine.width * 2; canvas.height = this.engine.height * 2;
    const renderer = new PaintRenderer(canvas, this.engine); renderer.render(true);
    try {
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export this painting.')), 'image/png'));
    } finally { renderer.dispose(); }
  }

  dispose() {
    this.gl.deleteTexture(this.texture); this.gl.deleteBuffer(this.buffer); this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
  }
}
