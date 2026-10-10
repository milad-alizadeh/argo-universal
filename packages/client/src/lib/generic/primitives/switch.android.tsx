import { Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { SwitchProps } from './switch-props';

type SwitchColors = NonNullable<
  React.ComponentProps<typeof ComposeSwitch>['colors']
>;

function Switch(props: SwitchProps): React.JSX.Element {
  const { colors } = useNativeTheme();
  return (
    <Host matchContents>
      <ComposeSwitch
        value={props.checked}
        onCheckedChange={props.onCheckedChange}
        enabled={!props.disabled}
        colors={{ ...enabledColors(colors), ...disabledColors(colors) }}
        modifiers={switchSemantics(props.accessibilityLabel)}
      />
    </Host>
  );
}

function enabledColors(colors: NativeColors): SwitchColors {
  return {
    checkedThumbColor: colors.background,
    checkedTrackColor: colors.tint,
    checkedBorderColor: colors.tint,
    checkedIconColor: colors.tint,
    uncheckedThumbColor: colors.mutedForeground,
    uncheckedTrackColor: colors.muted,
    uncheckedBorderColor: colors.mutedForeground,
    uncheckedIconColor: colors.muted,
  };
}

function disabledColors(colors: NativeColors): SwitchColors {
  return {
    disabledCheckedThumbColor: colors.background,
    disabledCheckedTrackColor: colors.disabledContainer,
    disabledCheckedBorderColor: colors.disabledContainer,
    disabledCheckedIconColor: colors.disabledContent,
    disabledUncheckedThumbColor: colors.disabledContent,
    disabledUncheckedTrackColor: colors.disabledContainer,
    disabledUncheckedBorderColor: colors.disabledContainer,
    disabledUncheckedIconColor: colors.disabledContainer,
  };
}

function switchSemantics(
  label: string | undefined,
): ReturnType<typeof semantics>[] {
  return label ? [semantics({ contentDescription: label })] : [];
}

export { Switch };
