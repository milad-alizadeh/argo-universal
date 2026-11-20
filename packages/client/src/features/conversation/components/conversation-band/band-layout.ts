/*
 * Where the Conversation band's bars sit. The strip has the same gap on its left, to the Composer's edge, as on its
 * right, to the label, and the bars fill it: as many as fit, centred, so what is left over is less than half a pitch on
 * each side. Plain numbers, so the same layout serves every platform.
 */

export const barWidth = 4;

// Centre to centre.
export const barPitch = 10;

// The height of the strip the bars stand in, and the tallest a bar grows, leaving a little room above and below.
export const stripHeight = 36;

export const barReach = 30;

export interface BarLayout {
  count: number;
  // Where the first bar starts, in the strip.
  start: number;
}

// As many bars as fit, centred in the strip.
export function barLayoutOf(stripWidth: number): BarLayout {
  if (stripWidth < barWidth) return { count: 0, start: 0 };

  const count = Math.floor((stripWidth - barWidth) / barPitch) + 1;
  const used = (count - 1) * barPitch + barWidth;

  return { count, start: (stripWidth - used) / 2 };
}

export const barLeft = (index: number, layout: BarLayout): number =>
  layout.start + index * barPitch;
