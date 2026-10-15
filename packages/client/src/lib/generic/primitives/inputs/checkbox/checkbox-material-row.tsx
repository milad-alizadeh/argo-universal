import { Row, Text, Checkbox as UniversalCheckbox } from '@expo/ui';
import * as Compose from '@expo/ui/jetpack-compose/modifiers';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import type { CheckboxRowProps } from './checkbox-apple-row';
import type { CheckboxIndicatorProps, CheckboxProps } from './checkbox-props';
import { RadioMark } from './checkbox-radio';

type Modifiers = NonNullable<React.ComponentProps<typeof Row>['modifiers']>;

type MarkProps = CheckboxIndicatorProps & { onToggle?: () => void };

const rowHeight = 64;

const optionHeight = 48;

const rowInset = 16;

const optionInset = 12;

const verticalInset = 8;

const rowGap = 12;

const optionGap = 16;

const optionMarkPixels = 18;

// Material's alpha for disabled content.
const disabledOpacity = 0.38;

// Material's checkbox row: the mark leads and the whole row toggles it.
export function MaterialCheckboxRow(
  props: CheckboxRowProps,
): React.JSX.Element {
  return (
    <Row
      alignment="center"
      spacing={props.variant === 'option' ? optionGap : rowGap}
      modifiers={[...rowSize(props), ...rowToggle(props), ...rowPadding(props)]}
    >
      <MaterialMark {...props} onToggle={props.state.toggle} />
      <RowLabel {...props} />
    </Row>
  );
}

function RowLabel(props: CheckboxProps): React.JSX.Element {
  const textStyle = useUniversalTextStyle('body');

  return (
    <Text
      textStyle={textStyle}
      style={props.disabled ? { opacity: disabledOpacity } : undefined}
      modifiers={[Compose.weight(1)]}
    >
      {props.label}
    </Text>
  );
}

function rowSize(props: CheckboxProps): Modifiers {
  return [
    Compose.fillMaxWidth(),
    Compose.defaultMinSize({
      minHeight: props.variant === 'option' ? optionHeight : rowHeight,
    }),
  ];
}

function rowPadding(props: CheckboxProps): Modifiers {
  const inset = props.variant === 'option' ? optionInset : rowInset;

  return [Compose.padding(inset, verticalInset, inset, verticalInset)];
}

function rowToggle(props: CheckboxRowProps): Modifiers {
  const description = [props.label, props.state.description].filter(Boolean);

  const semantics = Compose.semantics({
    contentDescription: description.join('. '),
  });

  return props.disabled ? [semantics] : [semantics, rowPress(props)];
}

function rowPress(props: CheckboxRowProps): Modifiers[number] {
  return props.selection === 'single'
    ? Compose.selectable(props.value, props.state.toggle, 'radioButton')
    : Compose.toggleable(props.value, props.state.toggle, { role: 'checkbox' });
}

export function MaterialMark(props: MarkProps): React.JSX.Element {
  if (props.selection !== 'single') return <CheckboxMark {...props} />;

  return (
    <RadioMark
      selected={props.value}
      disabled={props.disabled}
      modifiers={markSize(props)}
    />
  );
}

function CheckboxMark(props: MarkProps): React.JSX.Element {
  return (
    <UniversalCheckbox
      value={props.value}
      onValueChange={() => props.onToggle?.()}
      disabled={props.disabled}
      modifiers={markSize(props)}
    />
  );
}

function markSize(props: CheckboxIndicatorProps): Modifiers {
  return props.variant === 'option'
    ? [Compose.size(optionMarkPixels, optionMarkPixels)]
    : [];
}
