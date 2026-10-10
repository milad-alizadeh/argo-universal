import { Menu, Picker, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#lib/generic/primitives/host';
import { optionalTint } from '#lib/generic/primitives/swift-tint';
import type { ChoiceMenuProps } from './choice-menu';

// The system menu, with a check on the chosen item.
export function ChoiceMenu<Value extends string>({
  accessibilityLabel,
  value,
  choices,
  onValueChange,
  trigger,
}: ChoiceMenuProps<Value>): React.JSX.Element {
  const modifiers = useMenuModifiers(accessibilityLabel);
  return (
    <Host matchContents>
      <Menu
        modifiers={modifiers}
        label={
          <RNHostView matchContents>
            {/* The menu takes the tap, not the trigger drawn inside it. */}
            <View pointerEvents="none">{trigger}</View>
          </RNHostView>
        }
      >
        <Picker
          selection={value}
          onSelectionChange={(next: Value) => onValueChange(next)}
          modifiers={[pickerStyle('inline')]}
        >
          {choices.map((choice) => (
            <Text key={choice.value} modifiers={[tag(choice.value)]}>
              {choice.label}
            </Text>
          ))}
        </Picker>
      </Menu>
    </Host>
  );
}

// The tint colours the check on the chosen item.
function useMenuModifiers(
  accessibilityLabel: string,
): React.ComponentProps<typeof Menu>['modifiers'] {
  const { tint } = useNativeTheme().colors;
  return [
    accessibilityLabelModifier(accessibilityLabel),
    ...optionalTint(tint),
  ];
}
