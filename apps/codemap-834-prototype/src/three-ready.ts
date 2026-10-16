import { useEffect } from 'react';
import type { WebGLRenderer } from 'three';
import type { RendererInfo } from './model';
import type { ThreeContext } from './three-context';

function information(gl: WebGLRenderer, files: number): RendererInfo {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const parameter = debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER;

  return {
    renderer: String(context.getParameter(parameter)),
    engine: 'three.js / R3F',
    dpr: gl.getPixelRatio(),
    files,
  };
}

export function useThreeReady(ctx: ThreeContext): void {
  const { gl, onReady } = ctx;
  const files = ctx.tiles.length;
  useEffect(() => onReady(information(gl, files)), [gl, onReady, files]);
}
