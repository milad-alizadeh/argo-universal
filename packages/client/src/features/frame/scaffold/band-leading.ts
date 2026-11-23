import { useSymbolImageRenderer } from '@repo/kit/symbols/symbol-images';
import { useSyncExternalStore } from 'react';

// Where the title bar's leading controls start: the sidebar toggle in the open sidebar's top row, and the capsule that holds it once the sidebar closes.
export interface BandLeading {
  toggle: number;
  capsule: number;
}

/*
 * macOS keeps its traffic lights in the title bar: the toggle starts 9 points after the green light and the capsule 4
 * further on. Elsewhere the capsule takes the window's 8 inset and the toggle the panel's, 4 inside its edge.
 */
const bandLeadings = {
  mac: { toggle: 89, capsule: 93 },
  other: { toggle: 12, capsule: 8 },
} as const satisfies Record<string, BandLeading>;

// The desktop app hands over a symbol renderer on macOS only, so having one is how the page knows it runs there.
const useIsMacOS = (): boolean => useSymbolImageRenderer() !== null;

const unzoomed = (): number => 1;

const windowZoom = (): number =>
  globalThis.window?.argo?.window?.getZoomFactor?.() ?? unzoomed();

function watchWindowZoom(changed: () => void): () => void {
  const target = globalThis.window;

  if (target?.argo?.window?.getZoomFactor)
    target.addEventListener('resize', changed);

  return () => target?.removeEventListener?.('resize', changed);
}

export function useBandLeading(): BandLeading {
  const mac = useIsMacOS();
  const zoom = useSyncExternalStore(watchWindowZoom, windowZoom, unzoomed);
  const { toggle, capsule } = mac ? bandLeadings.mac : bandLeadings.other;
  // Keep the gap from the green light fixed as page zoom changes.
  const scale = mac ? zoom : 1;

  return { toggle: toggle / scale, capsule: capsule / scale };
}
