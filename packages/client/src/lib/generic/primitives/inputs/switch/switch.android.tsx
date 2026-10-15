// The universal Switch hides Compose's public colour props; keep the stock control with Argo tokens.
import { Switch as MaterialSwitch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '#primitives/native/native-control';
import type { SwitchProps } from './switch-props';

export function Switch(props: SwitchProps): ReactElement {
  return (
    <ControlHost matchContents>
      <MaterialSwitch {...controlProps(props)} colors={useSwitchColors()} />
    </ControlHost>
  );
}

function controlProps(
  props: SwitchProps,
): React.ComponentProps<typeof MaterialSwitch> {
  return {
    value: props.value,
    enabled: !props.disabled,
    onCheckedChange: props.onValueChange,
    modifiers: props.accessibilityLabel
      ? [semantics({ contentDescription: props.accessibilityLabel })]
      : [],
  };
}

function useSwitchColors(): React.ComponentProps<
  typeof MaterialSwitch
>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    checkedTrackColor: colors.accent,
    checkedThumbColor: colors.card,
    checkedBorderColor: colors.accent,
    uncheckedTrackColor: colors.muted,
    uncheckedThumbColor: colors.mutedForeground,
    uncheckedBorderColor: colors.mutedForeground,
    ...disabledColors(colors),
  };
}

function disabledColors(
  colors: ReturnType<typeof useNativeTheme>['colors'],
): React.ComponentProps<typeof MaterialSwitch>['colors'] {
  return {
    disabledCheckedTrackColor: colors.disabledContainer,
    disabledCheckedThumbColor: colors.content,
    disabledCheckedBorderColor: colors.disabledContainer,
    disabledUncheckedTrackColor: colors.disabledContainer,
    disabledUncheckedThumbColor: colors.disabledContent,
    disabledUncheckedBorderColor: colors.disabledContent,
  };
}
