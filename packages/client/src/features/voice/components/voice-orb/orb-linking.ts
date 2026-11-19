// A shader that failed to compile says why; one that compiled is returned as it is.
function checked(gl: WebGL2RenderingContext, shader: WebGLShader): void {
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;

  throw new Error(gl.getShaderInfoLog(shader) ?? 'The orb shader failed');
}

function compiling(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) throw new Error('The orb could not create a shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  return shader;
}

// Asking whether a program linked waits for the driver to finish; with this extension the page can ask whether it has.
const parallelOf = (
  gl: WebGL2RenderingContext,
): KHR_parallel_shader_compile | null =>
  gl.getExtension('KHR_parallel_shader_compile');

export interface OrbLinking {
  // Whether the driver has finished, so reading the result no longer stalls the page.
  done: () => boolean;
  // The linked program; throws what the shaders said when they failed.
  program: () => WebGLProgram;
}

interface Sources {
  vertex: string;
  fragment: string;
}

const linkLog = (gl: WebGL2RenderingContext, program: WebGLProgram): string =>
  gl.getProgramInfoLog(program) ?? 'The orb did not link';

function linkedOrThrow(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  shaders: WebGLShader[],
): WebGLProgram {
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

  for (const shader of shaders) checked(gl, shader);

  throw new Error(linkLog(gl, program));
}

// The driver has finished with the program, or cannot say so and the first read waits for it.
const finished = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  parallel: KHR_parallel_shader_compile | null,
): boolean =>
  !parallel ||
  gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) === true;

// Both shaders, compiling, on the program.
function attached(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  sources: Sources,
): WebGLShader[] {
  const shaders = [
    compiling(gl, gl.VERTEX_SHADER, sources.vertex),
    compiling(gl, gl.FRAGMENT_SHADER, sources.fragment),
  ];

  for (const shader of shaders) gl.attachShader(program, shader);

  return shaders;
}

/*
 * Compiles and links the orb's shaders without waiting for them: a cold compile of the orb's shader holds the page for
 * tens of milliseconds, so the drawing asks `done` each frame and only reads the program once the driver is finished.
 * Where the driver cannot say, it is done at once and the first read waits, as it always did.
 */
export function startLinking(
  gl: WebGL2RenderingContext,
  sources: Sources,
): OrbLinking {
  const program = gl.createProgram();
  const parallel = parallelOf(gl);
  const shaders = attached(gl, program, sources);
  gl.linkProgram(program);

  return {
    done: () => finished(gl, program, parallel),
    program: () => linkedOrThrow(gl, program, shaders),
  };
}
