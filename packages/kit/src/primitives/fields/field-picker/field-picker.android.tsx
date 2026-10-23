import { DropdownMenu, DropdownMenuItem } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { type ReactElement, useState } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';

type PickerProps = FieldGroupKitProps<'FieldGroup.Picker'>;

type Option = PickerProps['options'][number];

/*
 * Android Settings' choice row: a ListItem with the title and the current value as trailing text, and a
 * Material DropdownMenu opening on press.
 */
export function FieldPicker(props: PickerProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu
      expanded={open}
      onDismissRequest={() => setOpen(false)}
      modifiers={[fillMaxWidth()]}
    >
      <DropdownMenu.Trigger>
        <PickerRow {...props} onPress={() => setOpen(true)} />
      </DropdownMenu.Trigger>
      <PickerItems {...props} onChosen={() => setOpen(false)} />
    </DropdownMenu>
  );
}

function PickerRow(props: PickerProps & { onPress: () => void }): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      trailing={<ChosenLabel {...props} />}
      onPress={props.onPress}
    />
  );
}

// The chosen option's label, at the row's trailing edge.
function ChosenLabel(props: PickerProps): ReactElement {
  const chosen = props.options.find((option) => option.value === props.value);

  return <NativeText tone="muted">{chosen?.label ?? ''}</NativeText>;
}

type PickerItemsProps = PickerProps & { onChosen: () => void };

// One DropdownMenuItem per option; choosing one reports it and closes the menu.
function PickerItems(props: PickerItemsProps): ReactElement {
  return (
    <DropdownMenu.Items>
      {props.options.map((option) => (
        <PickerItem key={option.value} option={option} {...props} />
      ))}
    </DropdownMenu.Items>
  );
}

function PickerItem(
  props: PickerItemsProps & { option: Option },
): ReactElement {
  const choose = (): void => {
    props.onValueChange(props.option.value);
    props.onChosen();
  };

  return (
    <DropdownMenuItem onClick={choose}>
      <DropdownMenuItem.Text>
        <NativeText>{props.option.label}</NativeText>
      </DropdownMenuItem.Text>
    </DropdownMenuItem>
  );
}
