import { useSymbolImageRenderer } from '@repo/kit/symbols/symbol-images';
import { useWindowHistory } from './window-history';

// The band's leading group: its width, and where the sidebar toggle starts in it.
export interface BandLeading {
  width: number;
  inset: number;
}

// macOS keeps its traffic lights in the band; elsewhere the toggle starts at the frame's edge.
const bandLeadings = {
  mac: { width: 124, inset: 88 },
  other: { width: 44, inset: 8 },
} as const satisfies Record<string, BandLeading>;

// Back and Forward follow the toggle wherever the window has a history, two `md` IconButtons' 32px boxes.
const historyControlsWidth = 64;

// The desktop app hands over a symbol renderer on macOS only, so having one is how the page knows it runs there.
const useIsMacOS = (): boolean => useSymbolImageRenderer() !== null;

export function useBandLeading(): BandLeading {
  const { width, inset } = useIsMacOS() ? bandLeadings.mac : bandLeadings.other;
  const historyWidth = useWindowHistory() ? historyControlsWidth : 0;

  return { width: width + historyWidth, inset };
}
