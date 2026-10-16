import { useEffect } from 'react';
import type { FlatCamera, FlatContext, SetCamera } from './flat-context';

const minimumZoom = 0.2;

const maximumZoom = 12;

const wheelSensitivity = 0.001;

function zoom(camera: FlatCamera, delta: number): FlatCamera {
  return {
    ...camera,
    zoom: Math.max(
      minimumZoom,
      Math.min(maximumZoom, camera.zoom * Math.exp(-delta * wheelSensitivity)),
    ),
  };
}

function attach(
  host: HTMLDivElement | null,
  setCamera: SetCamera,
): (() => void) | undefined {
  if (!host) return;

  const handler = (event: WheelEvent): void => {
    event.preventDefault();
    setCamera((camera) => zoom(camera, event.deltaY));
  };

  host.addEventListener('wheel', handler, { passive: false });

  return () => host.removeEventListener('wheel', handler);
}

export function useFlatWheel({ host, setCamera }: FlatContext): void {
  useEffect(() => attach(host.current, setCamera), [host, setCamera]);
}
