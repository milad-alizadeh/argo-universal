import {
  Checkbox as ComposeCheckbox,
  Row,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  background,
  clip,
  Shapes,
  padding,
  fillMaxWidth,
  semantics,
  toggleable,
  selectable,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { useComposeTextStyle } from '../../native/native-typography';
import {
  useCheckboxColors,
  RadioMark,
  indicatorSize,
} from './checkbox-indicator.android';
import { createNativeCheckbox } from './checkbox-native';
export { CheckboxIndicator } from './checkbox-indicator.android';
import type { CheckboxProps } from './checkbox-props';
import type { CheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

export const Checkbox = createNativeCheckbox(CheckboxRow);

type RowProps = CheckboxProps & { state: CheckboxState };
const rowGap = 12;
const optionGap = 16;

function CheckboxRow(props: RowProps): React.JSX.Element {
  return createElement(
    Row,
    {
      verticalAlignment: 'center',
      horizontalArrangement: {
        spacedBy: props.appearance === 'option' ? optionGap : rowGap,
      },
      modifiers: useRowModifiers(props),
    },
    <CheckboxMark {...props} />,
    <CheckboxLabel {...props} />,
  );
}

const rowRadius = 10;
const rowHeight = 64;
const rowInset = 16;
const rowPadding = 8;
const optionHeight = 48;
const optionInset = 12;
function useRowModifiers(props: RowProps): ReturnType<typeof semantics>[] {
  const { muted } = useNativeTheme().colors;
  const inset = props.appearance === 'option' ? optionInset : rowInset;
  return [
    clip(Shapes.RoundedCorner(rowRadius)),
    background(rowBackground(props, muted)),
    fillMaxWidth(),
    defaultMinSize({
      minHeight: props.appearance === 'option' ? optionHeight : rowHeight,
    }),
    padding(inset, rowPadding, inset, rowPadding),
    ...rowToggle(props),
  ];
}
function rowBackground(props: RowProps, muted?: string): string {
  return props.appearance === 'option'
    ? 'transparent'
    : (muted ?? 'transparent');
}

function rowToggle(props: RowProps): ReturnType<typeof toggleable>[] {
  if (props.disabled) return [];
  return [
    checkboxSemantics(props),
    props.selection === 'single'
      ? selectable(props.value, props.state.toggle, 'radioButton')
      : toggleable(props.value, props.state.toggle, { role: 'checkbox' }),
  ];
}

function checkboxSemantics(props: RowProps): ReturnType<typeof semantics> {
  return semantics({
    contentDescription: [props.label, props.state.description]
      .filter(Boolean)
      .join('. '),
  });
}

function CheckboxMark(props: RowProps): React.JSX.Element {
  const colors = useCheckboxColors({ ...props, invalid: props.state.invalid });
  if (props.selection === 'single') return <RadioMark {...props} />;
  return createElement(ComposeCheckbox, {
    value: props.value,
    modifiers: markModifiers(props),
    enabled: !props.disabled,
    onCheckedChange: props.disabled ? props.state.toggle : undefined,
    colors,
  });
}

function CheckboxLabel(
  props: Pick<CheckboxProps, 'label' | 'disabled'>,
): React.JSX.Element {
  const style = useComposeTextStyle('body');
  const { colors } = useNativeTheme();
  return (
    <Text
      style={style}
      color={props.disabled ? colors.disabledContent : colors.foreground}
      modifiers={[weight(1)]}
    >
      {props.label}
    </Text>
  );
}

function markModifiers(props: RowProps): ReturnType<typeof semantics>[] {
  return [
    ...indicatorSize(props),
    ...(props.disabled ? [checkboxSemantics(props)] : []),
  ];
}
