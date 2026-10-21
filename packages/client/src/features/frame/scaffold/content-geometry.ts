import type { PaneSpan } from '../utils/pane-shift';
import type { ScaffoldGeometryInput } from './scaffold-geometry';

export function frameContent(
  input: ScaffoldGeometryInput,
  page: PaneSpan,
): PaneSpan {
  const available = page.width;

  const width = Math.min(
    available,
    input.measures.contentMaximum + input.measures.contentGutter * 2,
  );

  return { offset: page.offset + (available - width) / 2, width };
}
