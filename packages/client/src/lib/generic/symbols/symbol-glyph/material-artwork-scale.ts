import type { SystemDrawing } from '../drawn-symbol';

const artworkPercent = 90;

const defaultExtent = 80;

/*
 * Measured ink extents at 100px in MaterialSymbols_200ExtraLight, except chevron_right (300Light).
 * Artwork-fitted symbols fill 90% of their slot; other symbols retain their text metrics.
 */
const materialArtworkExtent: Partial<
  Record<SystemDrawing['material'], number>
> = {
  deployed_code: 74.16667938232422,
  neurology: 68.43750762939453,
  bolt: 73.64583587646484,
  tune: 70.83334350585938,
  add: 50,
  smart_toy: 75,
  chevron_right: 47.083333333333336,
};

export const materialArtworkScale = (name: SystemDrawing['material']): number =>
  artworkPercent / (materialArtworkExtent[name] ?? defaultExtent);
