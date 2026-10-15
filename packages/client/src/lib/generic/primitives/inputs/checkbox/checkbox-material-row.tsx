import { Row, Text, Checkbox as UniversalCheckbox } from '@expo/ui';
import * as Compose from '@expo/ui/jetpack-compose/modifiers';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import type {
  CheckboxIndicatorProps,
  CheckboxProps,
  CheckboxRowProps,
} from './checkbox-props';
import { RadioMark } from './checkbox-radio';

type Modifiers = NonNullable<React.ComponentProps<typeof Row>['modifiers']>;

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
      modifiers={[...rowSize(props), ...rowPress(props), ...rowPadding(props)]}
    >
      <MaterialMark {...props} />
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

// Android reads one description per node, so the label and the hint or error share it.
function describedBy(props: CheckboxRowProps): Modifiers[number] {
  const description = [props.label, props.state.description].filter(Boolean);

  return Compose.semantics({ contentDescription: description.join('. ') });
}

function rowPress(props: CheckboxRowProps): Modifiers {
  const semantics = describedBy(props);

  if (props.disabled) return [semantics];

  return [
    semantics,
    Compose.selectable(props.value, props.state.toggle, 'radioButton'),
  ];
}

// The stock Checkbox keeps its own role and state; only the description is replaced.
export function stockCheckboxSemantics(props: CheckboxRowProps): Modifiers {
  return [describedBy(props)];
}

export function MaterialMark(props: CheckboxIndicatorProps): React.JSX.Element {
  if (props.selection !== 'single') return <CheckboxMark {...props} />;

  return (
    <RadioMark
      selected={props.value}
      disabled={props.disabled}
      modifiers={markSize(props)}
    />
  );
}

function CheckboxMark(props: CheckboxIndicatorProps): React.JSX.Element {
  return (
    <UniversalCheckbox
      value={props.value}
      onValueChange={decorative}
      disabled={props.disabled}
      modifiers={markSize(props)}
    />
  );
}

// A mark only shows the state; the row or the caller owns the press.
function decorative(): void {}

function markSize(props: CheckboxIndicatorProps): Modifiers {
  return props.variant === 'option'
    ? [Compose.size(optionMarkPixels, optionMarkPixels)]
    : [];
}
