import type { PluginProps } from '@argo/plugin-kit';
import type { CodeFile } from './model';

type Tone = PluginProps['Canvas.Rect']['tone'];

export type BranchBand = 'high' | 'middle' | 'low';

// The least branching lines a file needs for each band: about the top 4% and the top 19% of the files that branch at all in a large repository, so most files stay neutral and the few hot ones stand out.
const bandFloors = { high: 15, middle: 6 };

const bandTones: Record<BranchBand, Tone> = {
  high: 'danger',
  middle: 'warning',
  low: 'neutral',
};

// The lightest and darkest shades a file's changes pick, so an unchanged file still shows.
const shades = { least: 0.15, range: 0.6 };

export function branchBand(branches: number): BranchBand {
  if (branches >= bandFloors.high) return 'high';

  if (branches >= bandFloors.middle) return 'middle';

  return 'low';
}

export const fileTone = (file: CodeFile): Tone =>
  bandTones[branchBand(file.branches)];

// Changes as a share of the most-changed file's, on a square-root ramp so a few hot files don't wash out the rest.
export function changeIntensity(file: CodeFile, mostTouches: number): number {
  const share = mostTouches > 0 ? Math.sqrt(file.touches / mostTouches) : 0;

  return shades.least + shades.range * share;
}
