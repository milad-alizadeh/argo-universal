import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { FieldPickerDrill, narrowed } from '#primitives/fields/field-picker';
import type { FieldPickerProps } from '#primitives/fields/field-picker';
import type { MetadataPickerProps } from './metadata-props';

type Choice = string | readonly string[];

// A `multiple` pick reports the held list toggled; the one value that differs from the held one is the pick.
function toggledValue(
  held: readonly string[],
  next: readonly string[],
): string | undefined {
  return [...next, ...held].find(
    (value) => next.includes(value) !== held.includes(value),
  );
}

const heldOf = (value: Choice): readonly string[] =>
  typeof value === 'string' ? [value] : value;

// A pick of a `multiple` field: the option and whether it is now chosen.
function toggler(
  props: MetadataPickerProps,
): (next: readonly string[]) => void {
  return (next) => {
    const value = toggledValue(heldOf(props.value), next);

    if (value !== undefined)
      void props.onToggle?.({ value, on: next.includes(value) });
  };
}

function reporter(props: MetadataPickerProps): (choice: Choice) => void {
  return (choice) =>
    typeof choice === 'string'
      ? props.onValueChange?.(choice)
      : toggler(props)(choice);
}

function createOf(
  props: MetadataPickerProps,
): FieldPickerProps['create'] | undefined {
  const { createLabel, onCreate } = props;

  if (!createLabel || !onCreate) return undefined;

  return {
    label: createLabel,
    onCreate: (text: string) => void onCreate(text),
  };
}

const pickerOf = (props: MetadataPickerProps): FieldPickerProps => ({
  title: props.title,
  value: props.value,
  options: props.options,
  presentation: 'page',
  multiple: props.multiple,
  searchable: props.searchable,
  loading: props.loading,
  loadError: props.loadError,
  create: createOf(props),
  onValueChange: reporter(props),
});

/*
 * An editable Metadata field: its children, the read-only fields, show the value, and pressing them opens the same
 * choices a Picker's page does, a popover with search on a desktop window and a pushed page elsewhere. The value is the
 * button; a tint on hover is its only sign.
 */
export function MetadataPicker(props: MetadataPickerProps): ReactElement {
  return (
    <FieldPickerDrill
      {...narrowed(pickerOf(props))}
      opener={<ValueButton title={props.title}>{props.children}</ValueButton>}
    />
  );
}

// The value reads as the button by a tint on hover alone.
const valueClass =
  '-mx-2 min-w-0 self-stretch rounded-md px-2 web:hover:bg-hover';

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
