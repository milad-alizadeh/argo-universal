import { Host, Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { usePrimitiveColor } from './primitive-color';
import type { SwitchProps } from './switch-props';

function Switch(props: SwitchProps): React.JSX.Element {
  const colors = useSwitchColors();
  return (
    <Host matchContents>
      <ComposeSwitch
        value={props.checked}
        onCheckedChange={props.onCheckedChange}
        enabled={!props.disabled}
        colors={colors}
        modifiers={switchSemantics(props.accessibilityLabel)}
      />
    </Host>
  );
}

function useSwitchColors(): React.ComponentProps<
  typeof ComposeSwitch
>['colors'] {
  const track = usePrimitiveColor('text-primary');
  const thumb = usePrimitiveColor('text-primary-foreground');
  return {
    checkedTrackColor: track,
    checkedBorderColor: track,
    checkedThumbColor: thumb,
  };
}

function switchSemantics(
  label: string | undefined,
): ReturnType<typeof semantics>[] {
  return label ? [semantics({ contentDescription: label })] : [];
}

export { Switch };
