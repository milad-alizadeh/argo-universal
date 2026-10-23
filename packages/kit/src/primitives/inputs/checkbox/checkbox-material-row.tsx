import { Row } from '@expo/ui';
import * as Compose from '@expo/ui/jetpack-compose/modifiers';
import { NativeText } from '#primitives/content/native-text';
import type { CheckboxRowProps } from './checkbox-apple-row';
import type { CheckboxProps } from './checkbox-props';
import { RadioMark, type RadioMarkProps } from './checkbox-radio';

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

// Material's radio row owns selection; the decorative mark has no separate action.
export function MaterialRadioRow(props: CheckboxRowProps): React.JSX.Element {
  return (
    <Row
      alignment="center"
      spacing={props.variant === 'option' ? optionGap : rowGap}
      modifiers={[...rowSize(props), ...rowToggle(props), ...rowPadding(props)]}
    >
      <RadioMark {...radioMarkProps(props)} />
      <RowLabel {...props} />
    </Row>
  );
}

function radioMarkProps(props: CheckboxProps): RadioMarkProps {
  return {
    selected: props.value,
    disabled: props.disabled,
    modifiers: markSize(props),
  };
}

function RowLabel(props: CheckboxProps): React.JSX.Element {
  const dimmed = props.disabled ? [Compose.alpha(disabledOpacity)] : [];

  return (
    <NativeText modifiers={[Compose.weight(1), ...dimmed]}>
      {props.label}
    </NativeText>
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
  const semantics = Compose.semantics({ contentDescription: props.label });

  return props.disabled ? [semantics] : [semantics, rowPress(props)];
}

function rowPress(props: CheckboxRowProps): Modifiers[number] {
  return Compose.selectable(props.value, props.state.toggle, 'radioButton');
}

function markSize(props: CheckboxProps): Modifiers {
  return props.variant === 'option'
    ? [Compose.size(optionMarkPixels, optionMarkPixels)]
    : [];
}
