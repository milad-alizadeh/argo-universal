import { useSymbolImageRenderer } from '@repo/kit/symbols/symbol-images';

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

export function useBandLeading(): BandLeading {
  return useSymbolImageRenderer() ? bandLeadings.mac : bandLeadings.other;
}
