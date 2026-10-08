import { Host, Menu, Picker, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import type { ChoiceMenuProps } from './choice-menu';

// The system menu, with a check on the chosen item.
export function ChoiceMenu<Value extends string>({
  accessibilityLabel,
  value,
  choices,
  onValueChange,
  trigger,
}: ChoiceMenuProps<Value>): React.JSX.Element {
  return (
    <Host matchContents>
      <Menu
        modifiers={[accessibilityLabelModifier(accessibilityLabel)]}
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
