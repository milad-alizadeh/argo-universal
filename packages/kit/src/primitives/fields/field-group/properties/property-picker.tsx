import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { Pressable } from 'react-native';
import {
  FieldPickerDrill,
  narrowed,
  type FieldPickerProps,
} from '#primitives/fields/field-picker';

export interface PropertyPickerProps {
  // The row's title, which groups the field under its heading.
  title: string;
  picker: FieldPickerProps;
  // The fields that show the value, made from the Picker's children.
  children: ReactNode;
}

/*
 * A Picker in a read-only FieldGroup: its children show the value, and pressing them opens the same choices a
 * Picker's page does, a popover with search on a desktop window and a pushed page elsewhere. The value is the button;
 * a tint on hover is its only sign.
 */
export function PropertyPicker(props: PropertyPickerProps): ReactElement {
  const { title } = props;

  return (
    <FieldPickerDrill
      {...narrowed({ ...props.picker, presentation: 'page' })}
      opener={<ValueButton title={title}>{props.children}</ValueButton>}
    />
  );
}

// The value reads as the button by a tint on hover alone, as wide as the value and no wider.
const valueClass =
  '-mx-2 max-w-full min-w-0 self-start rounded-md px-2 web:hover:bg-hover';

// The popover anchors to this button and presses it open, so what it hands down (ref, handlers, ARIA state) lands on the Pressable.
type ValueButtonProps = ComponentProps<typeof Pressable> & { title: string };

function ValueButton({ title, ...overlay }: ValueButtonProps): ReactElement {
  return (
    <Pressable
      {...overlay}
      role="button"
      aria-haspopup="dialog"
      accessibilityLabel={`Change ${title}`}
      className={valueClass}
    />
  );
}
