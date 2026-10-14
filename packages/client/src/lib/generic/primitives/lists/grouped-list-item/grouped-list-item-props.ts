import type { ComponentProps, ReactElement } from 'react';
import type { Pressable } from 'react-native';
import type { IconName } from '../../../symbols/icon-names';

export interface GroupedListItemProps {
  label: string;
  value?: string;
  // A second line under the title, such as a folder's path; code draws it in the mono face.
  subtitle?: { text: string; code?: boolean };
  icon?: IconName;
  // An image in the icon's slot, such as an Agent's logo; it stands in for icon.
  leading?: ReactElement;
  // An image beside the value, such as the selected Agent in Configure.
  valueLeading?: ReactElement;
  accessory?: ReactElement;
  // A native control in the row, such as a Switch; it shares the field's native Host.
  control?: ReactElement;
  // A control below the title and value, such as an effort slider.
  detail?: ReactElement;
  onPress?: () => void;
  // Web only, as phones have no pointer to hover with.
  onHoverIn?: ComponentProps<typeof Pressable>['onHoverIn'];
  onHoverOut?: ComponentProps<typeof Pressable>['onHoverOut'];
  /*
   * Web only: the whole row acts as the button or switch, with `checked` its state. Phones put a
   * native Switch in `control` instead, so the system control carries the state.
   */
  accessibilityRole?: 'button' | 'switch';
  checked?: boolean;
  disclosure?: boolean;
  accessibilityLabel?: string;
  /*
   * Web only: the row as a popover's or dialog's trigger, and a link's address. Phone rows open
   * sheets and push screens themselves, so nothing points at them.
   */
  ref?: ComponentProps<typeof Pressable>['ref'];
  id?: string;
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  href?: string;
  disabled?: boolean;
  selected?: boolean;
  /*
   * Phones only: the row is one choice of several, and the platform marks it, `selected` saying
   * which: iOS a system checkmark on the chosen row, Android a Material RadioButton on every row.
   */
  choice?: boolean;
  needsAttention?: boolean;
  // A dot after the value. When the value already says the status, such as "Ready", the name says it once.
  status?: { tone: 'success' | 'warning' | 'danger'; label: string };
  // A spinner takes the icon's place while the row's subject is on its way.
  loading?: boolean;
  // The title is code, such as a command, and draws in the mono face.
  code?: boolean;
  /*
   * The title reads as a failure, such as an error message standing in for the row's content,
   * as an action, such as "Add argument", drawn in the tint without a disclosure chevron,
   * or as a description standing in for a name, such as an Agent's beside its logo, drawn muted.
   */
  tone?: 'danger' | 'accent' | 'muted';
  // A row that stands alone as a card, such as an Agent's identity: a 40 tile leads it and it pads 16 all round.
  size?: 'lg';
}

// The status's label, unless the value already says it.
function distinctStatus(props: GroupedListItemProps): string | undefined {
  const status = groupedListItemStatus(props)?.label;

  return status === props.value ? undefined : status;
}

export function groupedListItemName(props: GroupedListItemProps): string {
  if (props.accessibilityLabel) return props.accessibilityLabel;

  return [props.label, props.subtitle?.text, props.value, distinctStatus(props)]
    .filter(Boolean)
    .join(', ');
}

export function groupedListItemStatus(
  props: Pick<GroupedListItemProps, 'status' | 'needsAttention'>,
): GroupedListItemProps['status'] {
  return (
    props.status ??
    (props.needsAttention
      ? { tone: 'warning', label: 'needs attention' }
      : undefined)
  );
}
