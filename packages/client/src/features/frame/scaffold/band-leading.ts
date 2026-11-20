import { useSymbolImageRenderer } from '@repo/kit/symbols/symbol-images';
import { useSyncExternalStore } from 'react';
import { useWindowHistory } from './window-history';

// The band's leading group: its width, and where the sidebar toggle starts in it.
export interface BandLeading {
  width: number;
  inset: number;
}

// macOS keeps its traffic lights in the band; elsewhere the toggle starts at the frame's edge.
const bandLeadings = {
  mac: { width: 125, inset: 89 },
  other: { width: 44, inset: 8 },
} as const satisfies Record<string, BandLeading>;

// Back and Forward follow the toggle wherever the window has a history, two `md` IconButtons' 32px boxes.
const historyControlsWidth = 64;

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
  const { width, inset } = mac ? bandLeadings.mac : bandLeadings.other;
  // Keep the 9-point gap from the green light fixed as page zoom changes.
  const leadingInset = mac ? inset / zoom : inset;
  const historyWidth = useWindowHistory() ? historyControlsWidth : 0;

  return {
    width: width - inset + leadingInset + historyWidth,
    inset: leadingInset,
  };
}
