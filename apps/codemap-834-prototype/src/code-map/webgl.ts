/*
 * The `3d` view needs WebGL. Chromium gives no WebGL context when GPU acceleration is off or
 * blocklisted, so the Code Map then draws `flat`, which draws on the CPU, and the page disables 3D.
 */
import type { View } from './model';

interface Canvas {
  getContext: (id: 'webgl2' | 'webgl') => object | null;
}

export function hasWebGL(canvas: Canvas): boolean {
  return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null;
}

export function drawnView(view: View, webgl: boolean): View {
  return webgl ? view : 'flat';
}

let probed: boolean | undefined;

/** Probes one throwaway canvas, once per page. */
export function supports3d(): boolean {
  probed ??= hasWebGL(document.createElement('canvas'));

  return probed;
}
