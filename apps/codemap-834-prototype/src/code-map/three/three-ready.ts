import { useFrame } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import type { RendererInfo } from '../model';
import type { ThreeContext } from './three-context';

function information(gl: WebGLRenderer, files: number): () => RendererInfo {
  return () => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const parameter = debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER;

    return {
      renderer: String(context.getParameter(parameter)),
      engine: 'three.js / R3F',
      dpr: gl.getPixelRatio(),
      files,
    };
  };
}

/** Reports readiness from the first frame R3F draws; the overlay ignores every later frame. */
export function useThreeReady({ gl, tiles, overlay }: ThreeContext): void {
  useFrame(() => overlay.drawn(information(gl, tiles.length)));
}
