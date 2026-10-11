import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { MenuCheck } from './menu-check';
import type { MenuProps } from './menu-props';
import { Text } from './text';

export type { MenuProps } from './menu-props';

export function Menu<Value extends string>({
  accessibilityLabel,
  value,
  choices,
  onValueChange,
  trigger,
  disabled,
}: MenuProps<Value>): React.JSX.Element {
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        asChild
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onKeyDown={() => setKeyboardFocus(true)}
        onPointerDown={() => setKeyboardFocus(false)}
      >
        {trigger}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="end"
          onKeyDown={() => setKeyboardFocus(true)}
          onPointerMove={() => setKeyboardFocus(false)}
          className="w-65 overflow-hidden bg-popover rounded-surface py-2 shadow-card dark:border dark:border-border"
        >
          <MenuPrimitive.RadioGroup
            value={value}
            onValueChange={(next) => {
              const selected = choices.find((choice) => choice.value === next);
              if (selected) onValueChange(selected.value);
            }}
          >
            {choices.map((choice) => (
              <MenuPrimitive.RadioItem
                key={choice.value}
                value={choice.value}
                textValue={choice.label}
                onPointerMove={() => setKeyboardFocus(false)}
                onKeyDown={(event) => {
                  setKeyboardFocus(true);
                  // The RN adapter selects on keydown; stop Radix's synthetic click selecting twice.
                  if (event.key === 'Enter' || event.key === ' ')
                    event.preventDefault();
                }}
                className={cn(
                  'min-h-9 flex-row items-center gap-3 cursor-default rounded-none outline-0 px-4 py-1.5 hover:bg-muted focus:bg-muted active:bg-border',
                  keyboardFocus &&
                    'focus-visible:outline-2 focus-visible:outline-foreground focus-visible:-outline-offset-2',
                )}
              >
                <View className="min-w-0 flex-1">
                  <Text
                    role="body"
                    className="select-none text-popover-foreground"
                  >
                    {choice.label}
                  </Text>
                </View>
                <View className="size-icon-menu-check items-center justify-center">
                  <MenuPrimitive.ItemIndicator>
                    <MenuCheck />
                  </MenuPrimitive.ItemIndicator>
                </View>
              </MenuPrimitive.RadioItem>
            ))}
          </MenuPrimitive.RadioGroup>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
