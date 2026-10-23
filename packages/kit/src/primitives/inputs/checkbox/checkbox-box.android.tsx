/*
 * The universal Checkbox's Android tree (a clickable Row of a Compose Checkbox and its Text label),
 * in Material's default colours, which the Host binds to Argo's tokens.
 */
import type { CheckboxProps } from '@expo/ui';
import { Checkbox, Row, Text } from '@expo/ui/jetpack-compose';
import {
  clickable,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import type { CheckboxBoxProps } from './checkbox-box';

export function CheckboxBox(props: CheckboxBoxProps): ReactElement {
  const box = <MaterialBox {...props} />;

  if (props.label == null) return box;

  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: 8 }}
      modifiers={[clickable(() => toggle(props))]}
    >
      {box}
      <Text style={props.inline ? inlineLabel : undefined}>{props.label}</Text>
    </Row>
  );
}

// Inline sits beside smaller content, so its label takes the secondary size.
const inlineLabel = { typography: 'bodyMedium' } as const;

function MaterialBox(props: CheckboxProps): ReactElement {
  return (
    <Checkbox
      value={props.value}
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
