import { useEffect } from 'react';
import type { FlatContext } from './flat-context';
import type { FlatViewport } from './flat-viewport';

const wheelSensitivity = 0.001;

function attach(
  host: HTMLDivElement | null,
  viewport: FlatViewport,
): (() => void) | undefined {
  if (!host) return;

  const handler = (event: WheelEvent): void => {
    event.preventDefault();
    viewport.zoom(Math.exp(-event.deltaY * wheelSensitivity));
  };

  host.addEventListener('wheel', handler, { passive: false });

  return () => host.removeEventListener('wheel', handler);
}

export function useFlatWheel({ host, viewport }: FlatContext): void {
  useEffect(() => attach(host.current, viewport), [host, viewport]);
}
