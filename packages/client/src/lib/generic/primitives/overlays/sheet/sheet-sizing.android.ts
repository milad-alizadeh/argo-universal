import {
  type ModifierConfig,
  fillMaxHeight,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type { SheetProps } from './sheet-props';

/*
 * How much of the window a sheet of pages opens to. Material's own half-open stop is half the window, which
 * showed four rows of the Agent list. This is the one height such a sheet takes, the same whichever page it
 * is on, so the reader moving between them never makes it grow or shrink (owner, 2026-10-21).
 */
const pagedHeight = 0.7;

/*
 * How much of the window the sheet's content takes, or nothing at all when it is as tall as what it holds.
 * A sheet that wrapped its pages was as tall as whichever page it held, so it changed height under the
 * reader; a sheet of pages takes the one height instead. A sheet that names its own heights rests where
 * Material puts it, as it did (owner, 2026-10-20).
 *
 * A sheet that names no heights and holds no pages, such as a one-page confirm, stays as tall as what it holds.
 */
export function sheetFill(
  props: Pick<SheetProps, 'detents'> & { paged: boolean },
): number | undefined {
  if (props.detents) return 1;

  return props.paged ? pagedHeight : undefined;
}

export function fillsHeight(
  props: Pick<SheetProps, 'detents'> & { paged: boolean },
): boolean {
  return sheetFill(props) !== undefined;
}

export function sheetModifiers(fill: number | undefined): ModifierConfig[] {
  if (fill === undefined) return [fillMaxWidth()];

  return [fillMaxWidth(), fillMaxHeight(fill)];
}
