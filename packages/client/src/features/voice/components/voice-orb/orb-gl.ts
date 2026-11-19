import { startLinking } from './orb-linking';
import type { OrbDrawn } from './orb-motion';
import { noiseSize, noiseTexels } from './orb-noise';
import { orbFragmentShader } from './orb-shader';

type Rgb = [number, number, number];

type Blue = { red: number; green: number; blue: number };

const rgbOf = ({ red, green, blue }: Blue): Rgb => [red, green, blue];

// ElevenLabs' defaults: the darker and the lighter blue the shader ramps between, each channel from 0 to 1.
const darker: Blue = { red: 0.792, green: 0.863, blue: 0.988 };

const lighter: Blue = { red: 0.627, green: 0.725, blue: 0.82 };

const vertexSource = `#version 300 es
in vec2 position;
out vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// The shader is written for three.js, which defines these names for it; a bare WebGL2 context needs the same four lines.
const fragmentSource = `#version 300 es
precision highp float;
#define varying in
out vec4 outColor;
#define gl_FragColor outColor
${orbFragmentShader}`;

const ovals = 7;

const fullScreenTriangles = [-1, -1, 1, -1, -1, 1, 1, 1];

// Where each of the seven ovals starts round the orb, fixed so the same orb is drawn each time.
const goldenAngle = 2.399963;

const offsets = Float32Array.from(
  { length: ovals },
  (_, index) => (index * goldenAngle) % (Math.PI * 2),
);

function upload(gl: WebGL2RenderingContext, texels: Uint8Array): void {
  const { TEXTURE_2D, RGBA, UNSIGNED_BYTE } = gl;
  gl.texImage2D(
    TEXTURE_2D,
    0,
    RGBA,
    noiseSize,
    noiseSize,
    0,
    RGBA,
    UNSIGNED_BYTE,
    texels,
  );
}

// The noise repeats and reads smoothly at any scale.
function sampling(gl: WebGL2RenderingContext): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function noiseTexture(gl: WebGL2RenderingContext): void {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  upload(gl, noiseTexels());
  sampling(gl);
}

function corners(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  const position = gl.getAttribLocation(program, 'position');
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(fullScreenTriangles),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

/*
 * The orb drawn on a bare WebGL2 context: ElevenLabs' fragment shader over one full-size quad, with the noise it reads
 * made locally. It draws the numbers `OrbMotion` gives it and holds no state of its own.
 */
export class OrbGl {
  private readonly program: WebGLProgram;

  public constructor(
    private readonly gl: WebGL2RenderingContext,
    program: WebGLProgram,
  ) {
    this.program = program;
    gl.useProgram(this.program);
    corners(gl, this.program);
    noiseTexture(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.fixed();
  }

  // What never changes during a call: the colours, the ovals' starting angles and the noise's place.
  private fixed(): void {
    this.gl.uniform3fv(this.at('uColor1'), rgbOf(darker));
    this.gl.uniform3fv(this.at('uColor2'), rgbOf(lighter));
    this.gl.uniform1fv(this.at('uOffsets'), offsets);
    this.gl.uniform1f(this.at('uInverted'), 0);
    this.gl.uniform1i(this.at('uPerlinTexture'), 0);
  }

  private at(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.program, name);
  }

  public draw(drawn: OrbDrawn): void {
    const { gl } = this;
    gl.uniform1f(this.at('uTime'), drawn.time);
    gl.uniform1f(this.at('uAnimation'), drawn.animation);
    gl.uniform1f(this.at('uInputVolume'), drawn.input);
    gl.uniform1f(this.at('uOutputVolume'), drawn.output);
    gl.uniform1f(this.at('uOpacity'), drawn.opacity);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, fullScreenTriangles.length / 2);
  }

  public dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}

// The orb's drawing on its way: the shaders compile while the page goes on drawing frames.
export interface OrbStarting {
  // The drawing once the shaders are ready, and nothing before.
  ready: () => OrbGl | undefined;
}

const startingOn = (gl: WebGL2RenderingContext): OrbStarting => {
  const linking = startLinking(gl, {
    vertex: vertexSource,
    fragment: fragmentSource,
  });

  return {
    ready: () =>
      linking.done() ? new OrbGl(gl, linking.program()) : undefined,
  };
};

// A drawing starting on the canvas, or nothing where the window has no WebGL2.
export function orbOn(canvas: HTMLCanvasElement): OrbStarting | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });

  return gl ? startingOn(gl) : null;
}
