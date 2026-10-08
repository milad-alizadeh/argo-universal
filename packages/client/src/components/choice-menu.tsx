import type * as React from 'react';
import type { ReactElement } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#primitives/dropdown-menu';
import { Text } from '#primitives/text';

export interface ChoiceMenuProps<Value extends string> {
  accessibilityLabel: string;
  value: Value;
  choices: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
  // What the menu opens from.
  trigger: ReactElement;
}

// Picks one of a few choices from a menu; iOS shows the system menu instead (ChoiceMenu.ios.tsx).
export function ChoiceMenu<Value extends string>({
  accessibilityLabel,
  value,
  choices,
  onValueChange,
  trigger,
}: ChoiceMenuProps<Value>): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild accessibilityLabel={accessibilityLabel}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            const selected = choices.find((choice) => choice.value === next);
            if (selected) onValueChange(selected.value);
          }}
        >
          {choices.map((choice) => (
            <DropdownMenuRadioItem key={choice.value} value={choice.value}>
              <Text>{choice.label}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
