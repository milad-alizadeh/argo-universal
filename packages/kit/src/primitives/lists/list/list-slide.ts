export interface Slide {
  // The lifted row's top and height, in the window.
  sourceTop: number;
  height: number;
  // Where the lifted row would land; none while it aims nowhere.
  lineY: number | undefined;
}

// Rows below the lifted row's slot close it up.
const closesAt = (slide: Slide, top: number): number =>
  top > slide.sourceTop ? -slide.height : 0;

const below = (top: number, lineY: number | undefined): boolean =>
  lineY !== undefined && top >= lineY;

// Rows below where the lifted row would land open a slot for it.
const opensAt = (slide: Slide, top: number): number =>
  below(top, slide.lineY) ? slide.height : 0;

// How far a row whose top sits at `top` moves aside while a row is lifted: up into the lifted row's slot, down to open one where it would land.
export function slideOffset(slide: Slide | undefined, top: number): number {
  if (!slide) return 0;

  return closesAt(slide, top) + opensAt(slide, top);
}
