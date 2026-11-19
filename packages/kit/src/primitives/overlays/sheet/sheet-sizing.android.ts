import {
  type ModifierConfig,
  fillMaxHeight,
  fillMaxWidth,
  onSizeChanged,
} from '@expo/ui/jetpack-compose/modifiers';
import type { SheetProps } from './sheet-props';

/*
 * How much of the window a sheet of pages opens to. Material's own half-open stop is half the window, which
 * showed four rows of the Agent list. This is the one height such a sheet takes, the same whichever page it
 * is on, so the reader moving between them never makes it grow or shrink (owner, 2026-10-21).
 */
const pagedHeight = 0.7;

export interface SheetSizing {
  // Whether the pages stretch to the sheet rather than each taking the height of what it holds.
  fill: boolean;
  /*
   * The height React Native gives the content, which Compose then wraps. A fraction of the window asked of
   * Compose did not hold the sheet to it, because Compose opens a sheet with no half stop at its full
   * height and the host view measured to that; a height measured here is one Compose has to wrap.
   */
  height?: number;
}

/*
 * A sheet that wrapped its pages was as tall as whichever page it held, so it changed height under the
 * reader; a sheet of pages is given the one height instead. A sheet that names its own heights rests where
 * Material puts it, as it did, and a sheet that names none and holds no pages is as tall as what it holds
 * (owner, 2026-10-20).
 */
export function sheetSizing(
  props: Pick<SheetProps, 'detents'> & { paged: boolean; window: number },
): SheetSizing {
  if (props.detents) return { fill: true };

  if (props.paged) return { fill: true, height: props.window * pagedHeight };

  return { fill: false };
}

export function sheetModifiers(sizing: SheetSizing): ModifierConfig[] {
  return wrapsContents(sizing)
    ? [fillMaxWidth()]
    : [fillMaxWidth(), fillMaxHeight()];
}

/*
 * A filled Sheet's Compose slot excludes the drag handle and system bars. Use its measured height
 * for the React Native page so its scroller can reach the same bottom edge.
 */
export const viewportModifiers = (
  onHeight: (height: number) => void,
): ModifierConfig[] => [
  fillMaxWidth(),
  fillMaxHeight(),
  onSizeChanged(({ height }) => onHeight(height)),
];

export const wrapsContents = (sizing: SheetSizing): boolean =>
  !sizing.fill || sizing.height !== undefined;
