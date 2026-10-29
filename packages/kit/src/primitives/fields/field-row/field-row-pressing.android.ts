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
 * A row with a long press but no tap, such as a movable row without a press or a disabled one: Compose's
 * `combinedClickable` opens its menu, with no ripple, since a tap does nothing. TalkBack offers the long press as an
 * action. Expo UI's bridge always gives the modifier a click handler and has no semantics actions or click labels
 * (`ModifierRegistry.kt`), so TalkBack still lists a tap, which does nothing; dropping it waits on upstream.
 */
const longPressOnly = (onLongClick: () => void): ModifierConfig =>
  combinedClickable({ onLongClick }, { indication: false });

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

  if (longPress) return [bothPresses(onClick, longPress)];

  return onClick ? [clickable(onClick)] : [];
}

const bothPresses = (
  onClick: (() => void) | undefined,
  onLongClick: () => void,
): ModifierConfig =>
  onClick
    ? combinedClickable({ onClick, onLongClick })
    : longPressOnly(onLongClick);
