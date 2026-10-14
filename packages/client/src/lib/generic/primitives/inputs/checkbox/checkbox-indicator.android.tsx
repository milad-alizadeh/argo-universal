import {
  Checkbox as ComposeCheckbox,
  RadioButton,
} from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import type { CheckboxIndicatorProps } from './checkbox-props';

const optionMarkPixels = 18;

function checkboxColors(
  colors: ReturnType<typeof useNativeTheme>['colors'],
  invalid: boolean,
  outline?: string,
): React.ComponentProps<typeof ComposeCheckbox>['colors'] {
  return {
    checkedColor: colors.tint,
    uncheckedColor: invalid
      ? colors.destructive
      : (outline ?? colors.mutedForeground),
    checkmarkColor: colors.background,
    disabledCheckedColor: colors.disabledContent,
    disabledUncheckedColor: colors.disabledContent,
  };
}

export function RadioMark(props: CheckboxIndicatorProps): React.JSX.Element {
  const theme = useNativeTheme();
  const { colors } = theme;

  return createElement(RadioButton, {
    selected: props.value,
    modifiers: indicatorSize(props),
    enabled: !props.disabled,
    colors: {
      selectedColor: colors.tint,
      unselectedColor: optionOutline(props, theme) ?? colors.mutedForeground,
    },
  });
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps,
): React.JSX.Element {
  return (
    <Host matchContents>
      <IndicatorDrawing {...props} />
    </Host>
  );
}

function IndicatorDrawing(props: CheckboxIndicatorProps): React.JSX.Element {
  const colors = useCheckboxColors(props);

  if (props.selection === 'single') return <RadioMark {...props} />;

  return (
    <ComposeCheckbox
      modifiers={indicatorSize(props)}
      value={props.value}
      enabled={!props.disabled}
      colors={colors}
    />
  );
}

export function indicatorSize(
  props: CheckboxIndicatorProps,
): ReturnType<typeof size>[] {
  return props.appearance === 'option'
    ? [size(optionMarkPixels, optionMarkPixels)]
    : [];
}

export function optionOutline(
  props: CheckboxIndicatorProps,
  theme: ReturnType<typeof useNativeTheme>,
): string | undefined {
  if (props.appearance !== 'option') return undefined;

  return theme.colorScheme === 'light'
    ? '#49454f'
    : theme.colors.mutedForeground;
}

export function useCheckboxColors(
  props: CheckboxIndicatorProps,
): React.ComponentProps<typeof ComposeCheckbox>['colors'] {
  const theme = useNativeTheme();

  return checkboxColors(
    theme.colors,
    !!props.invalid,
    optionOutline(props, theme),
  );
}
