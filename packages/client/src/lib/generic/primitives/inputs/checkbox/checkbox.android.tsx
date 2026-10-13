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
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { useComposeTextStyle } from '../../native/native-typography';
import { createNativeCheckbox } from './checkbox-native';
import type { CheckboxProps } from './checkbox-props';
import type { CheckboxState } from './checkbox-state';

export type { CheckboxProps } from './checkbox-props';

export const Checkbox = createNativeCheckbox(CheckboxRow);

type RowProps = CheckboxProps & { state: CheckboxState };
const rowGap = 12;

function CheckboxRow(props: RowProps): React.JSX.Element {
  return createElement(
    Row,
    {
      verticalAlignment: 'center',
      horizontalArrangement: { spacedBy: rowGap },
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
function useRowModifiers(props: RowProps): ReturnType<typeof semantics>[] {
  const { muted } = useNativeTheme().colors;
  return [
    clip(Shapes.RoundedCorner(rowRadius)),
    background(muted ?? 'transparent'),
    fillMaxWidth(),
    defaultMinSize({ minHeight: rowHeight }),
    padding(rowInset, rowPadding, rowInset, rowPadding),
    ...rowToggle(props),
  ];
}

function rowToggle(props: RowProps): ReturnType<typeof toggleable>[] {
  if (props.disabled) return [];
  return [
    checkboxSemantics(props),
    toggleable(props.value, props.state.toggle, { role: 'checkbox' }),
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
  const { colors } = useNativeTheme();
  return createElement(ComposeCheckbox, {
    value: props.value,
    modifiers: props.disabled ? [checkboxSemantics(props)] : [],
    enabled: !props.disabled,
    onCheckedChange: props.disabled ? props.state.toggle : undefined,
    colors: checkboxColors(colors, props.state.invalid),
  });
}

function checkboxColors(
  colors: ReturnType<typeof useNativeTheme>['colors'],
  invalid: boolean,
): React.ComponentProps<typeof ComposeCheckbox>['colors'] {
  return {
    checkedColor: colors.tint,
    uncheckedColor: invalid ? colors.destructive : colors.mutedForeground,
    checkmarkColor: colors.background,
    disabledCheckedColor: colors.disabledContent,
    disabledUncheckedColor: colors.disabledContent,
  };
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
