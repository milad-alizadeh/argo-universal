import type { ReactElement, ReactNode } from 'react';
import type { IconName } from '../../symbols/icon-names';

export interface FieldGroupProps {
  children: ReactNode;
  variant?: 'grouped' | 'navigation';
}

export interface FieldSectionProps {
  children: ReactNode;
  title?: string;
  footer?: string;
  // The footer reads as a failure, such as a field's error standing in for its hint.
  footerTone?: 'destructive';
  /*
   * The section holds FieldInputs. Android stacks them as bare Material fields, each with its
   * hint or error under it, so it draws no card and no footer; iOS and the web keep both.
   */
  textFields?: boolean;
}

// A text field in a section row; on iOS and the web its hint and its error sit in the section's footer.
export interface FieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  // An example value shown while the field is empty, so it reads as a place to type.
  placeholder?: string;
  // Any error marks the field invalid; the section's footer, or Android's line under the field, says what is wrong.
  errors?: readonly unknown[];
  // What to type, under the field on Android while it has no error; iOS and the web say it in the section's footer.
  hint?: string;
  // Code, such as a path or a command, draws in the mono face.
  mono?: boolean;
  disabled?: boolean;
}

export interface ListItemProps {
  title: string;
  value?: string;
  // A second line under the title, such as a folder's path; code draws it in the mono face.
  subtitle?: { text: string; code?: boolean };
  icon?: IconName;
  // An image in the icon's slot, such as an Agent's logo; it stands in for icon.
  leading?: ReactElement;
  accessory?: ReactElement;
  onPress?: () => void;
  href?: string;
  disabled?: boolean;
  selected?: boolean;
  needsAttention?: boolean;
  // A dot after the value. When the value already says the status, such as "Ready", the name says it once.
  status?: { tone: 'success' | 'warning' | 'destructive'; label: string };
  // A spinner takes the icon's place while the row's subject is on its way.
  loading?: boolean;
  // The title is code, such as a command, and draws in the mono face.
  code?: boolean;
  /*
   * The title reads as a failure, such as an error message standing in for the row's content,
   * as an action, such as "Add argument", drawn in the tint without a disclosure chevron,
   * or as a description standing in for a name, such as an Agent's beside its logo, drawn muted.
   */
  tone?: 'destructive' | 'accent' | 'muted';
  // A row that stands alone as a card, such as an Agent's identity: a 40 tile leads it and it pads 16 all round.
  size?: 'large';
}

// The status's label, unless the value already says it.
function distinctStatus(props: ListItemProps): string | undefined {
  const status = listItemStatus(props)?.label;
  return status === props.value ? undefined : status;
}

export function listItemName(props: ListItemProps): string {
  return [props.title, props.subtitle?.text, props.value, distinctStatus(props)]
    .filter(Boolean)
    .join(', ');
}

export function listItemStatus(
  props: Pick<ListItemProps, 'status' | 'needsAttention'>,
): ListItemProps['status'] {
  return (
    props.status ??
    (props.needsAttention
      ? { tone: 'warning', label: 'needs attention' }
      : undefined)
  );
}
