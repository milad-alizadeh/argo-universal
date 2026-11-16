import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { FieldPickerDrill, narrowed } from '#primitives/fields/field-picker';
import type {
  FieldPickerProps,
  PickReport,
} from '#primitives/fields/field-picker';
import type { MetadataPickerProps } from './metadata-props';

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

const fieldOf = (props: MetadataPickerProps): FieldPickerProps => ({
  title: props.title,
  value: props.value,
  options: props.options,
  presentation: 'page',
  multiple: props.multiple,
  searchable: props.searchable,
  loading: props.loading,
  loadError: props.loadError,
  create: createOf(props),
  onValueChange: (choice) => {
    if (typeof choice === 'string') props.onValueChange?.(choice);
  },
});

// A `multiple` field hears each pick, the value pressed and whether it is now chosen, rather than the list.
function pickerOf(
  props: MetadataPickerProps,
): FieldPickerProps & { onPick?: (pick: PickReport) => void } {
  const picker = fieldOf(props);

  if (props.multiple === true)
    return { ...picker, onPick: (pick) => void props.onToggle?.(pick) };

  return picker;
}

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
