import {
  type ModifierConfig,
  fillMaxHeight,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type { SheetProps } from './sheet-props';

/*
 * A sheet is as tall as what it holds; only one that names heights of its own fills the window and rests
 * where Material puts it. Pages used to count as naming them, which is why a sheet with pages opened half
 * way up the window whatever its page held: it now opens at the size of its container (owner, 2026-10-21).
 */
export function fillsHeight(props: Pick<SheetProps, 'detents'>): boolean {
  return props.detents !== undefined;
}

export function sheetModifiers(fill: boolean): ModifierConfig[] {
  return fill ? [fillMaxWidth(), fillMaxHeight()] : [fillMaxWidth()];
}
