/*
 * The universal Picker's Android tree: Material's ExposedDropdownMenuBox around a read-only filled
 * TextField, with Argo's colours through TextField `colors` (TextFieldColors), ExposedDropdownMenu
 * `containerColor` and DropdownMenuItem `elementColors`. The universal Picker takes none, and the
 * Host's tonal palette tints its field and menu teal.
 */
import {
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Text,
  TextField,
  type TextFieldRef,
} from '@expo/ui/jetpack-compose';
import {
  menuAnchor,
  onVisibilityChanged,
} from '@expo/ui/jetpack-compose/modifiers';
import {
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type {
  PickerMenuItem,
  PickerMenuProps,
} from './picker-native-menu-props';

export function PickerNativeMenu(props: PickerMenuProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const close = (): void => setExpanded(false);

  return (
    <ExposedDropdownMenuBox
      expanded={expanded}
      onExpandedChange={props.enabled ? setExpanded : undefined}
    >
      <AnchorField {...props} />
      <PickerItems {...props} expanded={expanded} onClose={close} />
    </ExposedDropdownMenuBox>
  );
}

/*
 * As the universal Picker: the anchor field is uncontrolled, so the chosen label is set once the
 * field is on screen.
 */
function AnchorField(props: PickerMenuProps): ReactElement {
  const field = useRef<TextFieldRef>(null);
  const [visible, setVisible] = useState(false);

  useLabelOnceVisible(field, visible, selectedLabel(props));

  return (
    <TextField
      ref={field}
      readOnly
      enabled={props.enabled}
      colors={useMaterialPalette().filledFieldColors}
      modifiers={[menuAnchor(), onVisibilityChanged(setVisible)]}
    />
  );
}

function useLabelOnceVisible(
  field: RefObject<TextFieldRef | null>,
  visible: boolean,
  label: string,
): void {
  useEffect(() => {
    if (visible) void field.current?.setText(label);
  }, [field, label, visible]);
}

function selectedLabel(props: PickerMenuProps): string {
  return (
    props.items.find((item) => item.value === props.selectedValue)?.label ?? ''
  );
}

type ItemsProps = PickerMenuProps & { expanded: boolean; onClose: () => void };

function PickerItems(props: ItemsProps): ReactElement {
  return (
    <ExposedDropdownMenu
      expanded={props.expanded}
      onDismissRequest={props.onClose}
      containerColor={useMaterialPalette().roles.surfaceContainer}
    >
      {props.items.map((item) => (
        <PickerItem key={item.value} {...props} item={item} />
      ))}
    </ExposedDropdownMenu>
  );
}

function PickerItem(
  props: ItemsProps & { item: PickerMenuItem },
): ReactElement {
  return (
    <DropdownMenuItem
      elementColors={useMaterialPalette().menuItemColors}
      onClick={props.enabled ? () => choose(props) : undefined}
    >
      <DropdownMenuItem.Text>
        <Text>{props.item.label}</Text>
      </DropdownMenuItem.Text>
    </DropdownMenuItem>
  );
}

function choose(props: ItemsProps & { item: PickerMenuItem }): void {
  props.onValueChange(props.item.value);
  props.onClose();
}
