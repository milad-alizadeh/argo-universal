import {
  formLook,
  placeLook,
  platformLook,
  insetLook,
  rowsLook,
  type FormLook,
  type InsetLook,
  type ListLookInput,
  type PlaceLook,
  type PlatformLook,
  type RowsLook,
} from './list-look-parts';
import { drawingOf } from './list-look-platform';
import { sectionDrawing, type SectionDrawing } from './list-look-section';
import { listPlaceFacts } from './list-place';

export type {
  DisclosureGlyph,
  PhoneDrawing,
  RowHighlight,
  SelectionBar,
  SelectionMark,
  ValuePlacement,
} from './list-look-platform';

export {
  phonesGrouped,
  type ListLookInput,
  type PhoneOverrides,
} from './list-look-parts';

/*
 * How a List draws, decided once from the platform, the place, the width and the appearance: every part of the List
 * reads these facts, and none asks Platform.OS or what contains it. The sizes are Tailwind classes and spacing steps,
 * kept here.
 */
export interface ListLook
  extends PlaceLook, FormLook, RowsLook, InsetLook, PlatformLook {
  // How the header and footer of a section draw, their inset from the List's edge included.
  section: SectionDrawing;
}

export function resolveListLook(input: ListLookInput): ListLook {
  const drawing = drawingOf(input.platform);
  const place = listPlaceFacts(input.place);
  const form = formLook(drawing, input);
  const rows = rowsLook(drawing, input, place);
  const phone = form.phone !== undefined;

  return {
    ...placeLook(input, place),
    ...form,
    ...rows,
    ...insetLook(drawing, input, { ...form, ...place }),
    ...platformLook(input, place.menu),
    section: sectionDrawing({ ...place, ...rows, ...form, phone }),
  };
}
