import {
  type ModifierConfig,
  fillMaxHeight,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type { SheetProps } from './sheet-props';
import { sheetDetents } from './sheet-state';

/*
 * A sheet that rests at a height of Material's choosing fills the window. Material only offers the half-open
 * stop when the content is taller than half the window, so a sheet that wrapped its pages opened as tall as
 * whichever page it held and had no half-open stop to rest at. Filling is what gives it one; where it then
 * sits is Material's to decide and the reader's to drag, never a page's to take (owner, 2026-10-20).
 *
 * A sheet that names no heights, such as a one-page confirm, stays as tall as what it holds.
 */
export function fillsHeight(
  props: Pick<SheetProps, 'detents'> & { paged: boolean },
): boolean {
  return sheetDetents(props) !== undefined;
}

export function sheetModifiers(fill: boolean): ModifierConfig[] {
  return fill ? [fillMaxWidth(), fillMaxHeight()] : [fillMaxWidth()];
}
