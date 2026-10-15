import { Button, Row, Spacer } from '@expo/ui';
import * as Swift from '@expo/ui/swift-ui/modifiers';
import { rectangularHitArea } from '#primitives/native/native-modifiers';
import { NativeText } from '#primitives/native/native-text';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { CheckboxProps } from './checkbox-props';
import type { CheckboxState } from './checkbox-state';

export type CheckboxRowProps = CheckboxProps & { state: CheckboxState };

type Modifiers = NonNullable<React.ComponentProps<typeof Row>['modifiers']>;

const rowHeight = 48;

const optionHeight = 32;

const rowInset = 16;

const optionInset = 12;

const verticalInset = 8;

// Apple's checklist row: the label leads and a check trails the chosen row.
export function AppleRadioRow(props: CheckboxRowProps): React.JSX.Element {
  return (
    <Button
      variant="text"
      onPress={props.state.toggle}
      disabled={props.disabled}
      modifiers={rowSemantics(props)}
    >
      <RowContent {...props} />
    </Button>
  );
}

function RowContent(props: CheckboxProps): React.JSX.Element {
  return (
    <Row alignment="center" modifiers={rowLayout(props.variant === 'option')}>
      <RowLabel {...props} />
      <Spacer flexible />
      {props.value && <CheckMark />}
    </Row>
  );
}

// The label keeps the Button's own font, which scales with Dynamic Type.
function RowLabel(props: CheckboxProps): React.JSX.Element {
  return <NativeText>{props.label}</NativeText>;
}

// The check takes the label's colour: native rows get no colour but the Host's tint.
export function CheckMark(): React.JSX.Element {
  return <NativeSymbol name="check" role="mark" />;
}

function rowLayout(option: boolean): Modifiers {
  return [
    Swift.frame({
      minHeight: option ? optionHeight : rowHeight,
      maxWidth: Infinity,
    }),
    Swift.padding({
      horizontal: option ? optionInset : rowInset,
      vertical: verticalInset,
    }),
    rectangularHitArea(),
  ];
}

function rowSemantics(props: CheckboxRowProps): Modifiers {
  return [
    Swift.accessibilityElement('ignore'),
    Swift.accessibilityLabel(props.label),
    Swift.accessibilityValue(props.value ? 'Checked' : 'Unchecked'),
    rowTraits(props),
    Swift.accessibilityHint(props.state.description ?? ''),
  ];
}

function rowTraits(
  props: CheckboxProps,
): ReturnType<typeof Swift.accessibilityAddTraits> {
  return Swift.accessibilityAddTraits(
    props.value ? ['isButton', 'isSelected'] : ['isButton'],
  );
}
