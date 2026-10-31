import type { PluginProps } from '@argo/plugin-kit';
import type { CodeFile } from './model';

type Tone = PluginProps['Canvas.Rect']['tone'];

export type BranchBand = 'high' | 'middle' | 'low';

// The #834 prototype's bands for its lexical branch count.
const bandFloors = { high: 20, middle: 9 };

const bandTones: Record<BranchBand, Tone> = {
  high: 'danger',
  middle: 'warning',
  low: 'neutral',
};

// The quietest shade a file's changes pick, so an unchanged file still shows.
const leastIntensity = 0.125;

// The strongest shade each band's tiles reach. A caption is drawn in the foreground token, and a shade past these gets near enough to it that the file's name stops reading (#1736): the last shades that keep 4.5:1 against it in light and in dark.
const intensityCeilings: Record<BranchBand, number> = {
  low: 0.375,
  middle: 0.125,
  high: 0.25,
};

export function branchBand(branches: number): BranchBand {
  if (branches >= bandFloors.high) return 'high';

  if (branches >= bandFloors.middle) return 'middle';

  return 'low';
}

export const fileTone = (file: CodeFile): Tone =>
  bandTones[branchBand(file.branches)];

// Changes as a share of the most-changed file's, on a square-root ramp so a few hot files don't wash out the rest; the ramp ends at the tone's ceiling.
export function changeIntensity(file: CodeFile, mostTouches: number): number {
  const share = mostTouches > 0 ? Math.sqrt(file.touches / mostTouches) : 0;
  const ceiling = intensityCeilings[branchBand(file.branches)];

  return leastIntensity + (ceiling - leastIntensity) * share;
}
