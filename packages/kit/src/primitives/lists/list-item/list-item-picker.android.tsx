import {
  AlertDialog,
  Column,
  RadioButton,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  padding,
  semantics,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState, type ComponentProps, type ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { useSpacing } from '../../../use-spacing';
import { ListItemFrame } from './list-item';
import {
  pickerRowValue,
  type ListItemPickerProps,
} from './list-item-picker-props';

export type { ListItemPickerProps } from './list-item-picker-props';

type DialogProps<Value extends string = string> = ListItemPickerProps<Value> & {
  close: () => void;
};

type ChoiceProps<Value extends string> = DialogProps<Value> & {
  option: ListItemPickerProps<Value>['options'][number];
};

export function ListItemPicker<Value extends string>(
  props: ListItemPickerProps<Value>,
): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ListItemFrame
        {...props}
        value={pickerRowValue(props)}
        onPress={() => setOpen(true)}
      />
      {open ? <PickerDialog {...props} close={() => setOpen(false)} /> : null}
    </>
  );
}

function PickerDialog<Value extends string>(
  props: DialogProps<Value>,
): ReactElement {
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={props.close}>
        <DialogContent {...props} />
      </AlertDialog>
    </Host>
  );
}

function Choices<Value extends string>(
  props: DialogProps<Value>,
): ReactElement {
  return (
    <Column>
      {props.options.map((option) => (
        <Choice key={option.value} option={option} {...props} />
      ))}
    </Column>
  );
}

function Choice<Value extends string>(props: ChoiceProps<Value>): ReactElement {
  return (
    <Row verticalAlignment="center" modifiers={useChoiceModifiers(props)}>
      <ChoiceRadio {...props} />
      <Text>{props.option.label}</Text>
    </Row>
  );
}

function useChoiceModifiers<Value extends string>(
  props: ChoiceProps<Value>,
): ComponentProps<typeof Row>['modifiers'] {
  const inset = useSpacing('--spacing-3');

  return [
    clickable(() => choose(props)),
    padding(0, inset, 0, inset),
    semantics({ contentDescription: props.option.label }),
  ];
}

function ChoiceRadio<Value extends string>(
  props: ChoiceProps<Value>,
): ReactElement {
  return (
    <RadioButton
      selected={props.value === props.option.value}
      enabled={!props.option.disabled}
      colors={useMaterialPalette().radioColors}
      onClick={() => choose(props)}
    />
  );
}

function choose<Value extends string>(props: ChoiceProps<Value>): void {
  if (props.option.disabled) return;
  props.onValueChange(props.option.value);
  props.close();
}

function DialogContent<Value extends string>(
  props: DialogProps<Value>,
): ReactElement {
  return (
    <>
      <AlertDialog.Title>
        <Text>{props.title}</Text>
      </AlertDialog.Title>
      <AlertDialog.Text>
        <Choices {...props} />
      </AlertDialog.Text>
    </>
  );
}
