import type { BandGeometryInput, WindowBox } from './band-geometry';
import type { ScaffoldPartProps } from './use-scaffold-layout';
import { hasWindowHistory } from './window-history';

// What the title bar's geometry reads of the Scaffold: whether it holds a list and a Session, and the layout.
export const bandGeometryInput = ({
  scaffold,
  layout,
}: ScaffoldPartProps): BandGeometryInput => ({
  layout,
  listed: Boolean(scaffold.list),
  history: hasWindowHistory,
  session: Boolean(scaffold.band?.session),
  movingWidth: layout.movingWidth,
});

// A box in the window, placed in the title bar's row, which starts the safe area's top down.
export const inBand = (box: WindowBox, safeTop: number): WindowBox => ({
  ...box,
  y: box.y - safeTop,
});
