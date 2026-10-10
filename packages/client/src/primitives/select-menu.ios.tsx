import { Host, Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  disabled as disabledModifier,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import type { SelectMenuProps } from './select-menu';

const unchosen = '';

// The system pop-up menu; it shows the placeholder until a choice is made.
export function SelectMenu<Value extends string>({
  value,
  options,
  onValueChange,
  accessibilityLabel,
  placeholder = 'Choose…',
  disabled,
  invalid,
}: SelectMenuProps<Value>): React.JSX.Element {
  const destructive = useResolveClassNames('text-destructive').color;
  const chosen = options.find((option) => option.value === value);
  return (
    <Host matchContents>
      <Picker
        selection={chosen?.value ?? unchosen}
        onSelectionChange={(next: string) => {
          const option = options.find((item) => item.value === next);
          if (option) onValueChange(option.value);
        }}
        modifiers={[
          pickerStyle('menu'),
          accessibilityLabelModifier(accessibilityLabel),
          disabledModifier(disabled),
          ...(invalid && typeof destructive === 'string'
            ? [tint(destructive)]
            : []),
        ]}
      >
        {chosen ? null : <Text modifiers={[tag(unchosen)]}>{placeholder}</Text>}
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
