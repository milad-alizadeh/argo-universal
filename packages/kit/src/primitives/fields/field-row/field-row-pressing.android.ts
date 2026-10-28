import {
  alpha,
  clickable,
  combinedClickable,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import { useContext } from 'react';
import { GroupDisabledContext } from './field-row-position';

// What a row's press and dimming read: its press, and whether it is disabled on its own.
interface PressedRow {
  onPress?: () => void;
  disabled?: boolean;
}

// Material's disabled content opacity (38%); ListItem has no disabled colours of its own.
const disabledContentAlpha = 0.38;

// A row is disabled on its own or with its whole FieldGroup.
export function useDisabled(own: boolean | undefined): boolean {
  const group = useContext(GroupDisabledContext);

  return own === true || group;
}

// A disabled row's content draws at Material's disabled opacity.
export const dimming = (off: boolean): ModifierConfig[] =>
  off ? [alpha(disabledContentAlpha)] : [];

const tapped = (props: PressedRow, off: boolean): (() => void) | undefined =>
  off ? undefined : props.onPress;

/*
 * A tap runs the row's press; with a long press, Compose's `combinedClickable` takes both, as one clickable a nested
 * one would shadow.
 */
export function pressing(
  props: PressedRow,
  off: boolean,
  longPress: (() => void) | undefined,
): ModifierConfig[] {
  const onClick = tapped(props, off);

  if (longPress)
    return [combinedClickable({ onClick, onLongClick: longPress })];

  return onClick ? [clickable(onClick)] : [];
}
