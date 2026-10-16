/*
 * The universal Checkbox's Android tree (a clickable Row of a Compose Checkbox and its Text label),
 * with Argo's colours through Checkbox `colors` (CheckboxColors); the universal Checkbox takes none,
 * and the Host's tonal palette turns its checked box teal.
 */
import type { CheckboxProps } from '@expo/ui';
import { Checkbox, Row, Text } from '@expo/ui/jetpack-compose';
import {
  clickable,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';

export function CheckboxBox(props: CheckboxProps): ReactElement {
  const box = <MaterialBox {...props} />;

  if (props.label == null) return box;

  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: 8 }}
      modifiers={[clickable(() => toggle(props))]}
    >
      {box}
      <Text>{props.label}</Text>
    </Row>
  );
}

function MaterialBox(props: CheckboxProps): ReactElement {
  return (
    <Checkbox
      value={props.value}
      colors={useMaterialPalette().checkboxColors}
      onCheckedChange={props.disabled ? undefined : props.onValueChange}
      enabled={!props.disabled}
      modifiers={boxModifiers(props)}
    />
  );
}

function toggle(props: CheckboxProps): void {
  if (!props.disabled) props.onValueChange(!props.value);
}

// As the universal Checkbox: the caller's modifiers, then the test id.
function boxModifiers(props: CheckboxProps): CheckboxProps['modifiers'] {
  return [
    ...(props.modifiers ?? []),
    ...(props.testID ? [testIDModifier(props.testID)] : []),
  ];
}
