import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import {
  createFlatViewport,
  type FlatFrame,
  type FlatViewport,
} from './flat-viewport';
import { mapExtent, type RendererProps } from './model';
import type { Size } from './viewport';
import { useViewportHandle } from './viewport-handle';

export interface FlatContext extends RendererProps {
  host: RefObject<HTMLDivElement | null>;
  viewport: FlatViewport;
  /** Changes whenever the view moves or resizes, so effects that draw depend on it. */
  frame: FlatFrame;
  size: Size;
}

const initialSize: Size = { width: 1000, height: 700 };

function observe(
  host: HTMLDivElement | null,
  viewport: FlatViewport,
): (() => void) | undefined {
  if (!host) return;

  const observer = new ResizeObserver(([entry]) => {
    if (entry)
      viewport.resize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
  });

  observer.observe(host);

  return () => observer.disconnect();
}

function useFlatViewport(tiles: RendererProps['tiles']): FlatViewport {
  return useMemo(
    () => createFlatViewport({ tiles, extent: mapExtent }, initialSize),
    [tiles],
  );
}

export function useFlatContext(
  props: RendererProps,
  host: RefObject<HTMLDivElement | null>,
): FlatContext {
  const viewport = useFlatViewport(props.tiles);
  useEffect(() => observe(host.current, viewport), [host, viewport]);
  useViewportHandle(props.overlay.viewport, viewport);
  const frame = useSyncExternalStore(viewport.subscribe, viewport.frame);

  return { ...props, host, viewport, frame, size: frame.size };
}
