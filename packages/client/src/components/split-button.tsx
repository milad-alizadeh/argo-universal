import type * as React from 'react';
import { type ReactElement, type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { ChoiceMenu } from './choice-menu';
import { ComposerSheet } from './composer-sheet';
import { useContentWide } from './content-layout';

export interface SplitButtonChoice<Value extends string> {
  value: Value;
  label: string;
}

export interface SplitButtonProps<Value extends string> {
  // The button that acts on the chosen value; round its right corners to rounded-sm.
  children: ReactElement;
  choices: readonly SplitButtonChoice<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  menuLabel: string;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

// A button with a chevron that picks what the button does; desktop opens a menu, phone a Sheet.
export function SplitButton<Value extends string>(
  props: SplitButtonProps<Value>,
): React.JSX.Element {
  const wide = useContentWide();
  return (
    <View className={cn('flex-row gap-0.5', props.className)}>
      {props.children}
      {wide ? (
        <ChoiceMenu
          accessibilityLabel={props.menuLabel}
          value={props.value}
          choices={props.choices}
          onValueChange={props.onValueChange}
          trigger={chevron(props, true)}
        />
      ) : (
        <ChoiceSheet {...props} />
      )}
    </View>
  );
}

// A Button element, so the menu's asChild trigger can pass its press handlers to it.
function chevron(
  {
    menuLabel,
    primary,
    disabled,
  }: Pick<SplitButtonProps<string>, 'menuLabel' | 'primary' | 'disabled'>,
  wide: boolean,
): React.JSX.Element {
  return (
    <Button
      variant={primary ? 'default' : 'ghost'}
      accessibilityLabel={menuLabel}
      disabled={disabled}
      className={
        wide
          ? 'h-8 w-7 rounded-md rounded-l-sm px-0 sm:h-8'
          : 'h-11 w-11 rounded-lg rounded-l-md px-0 sm:h-11'
      }
    >
      <Icon
        name="chevron-down"
        size="sm"
        className={
          primary ? 'text-primary-foreground' : 'text-muted-foreground'
        }
      />
    </Button>
  );
}

const ignoreClosed = (): void => undefined;

function ChoiceSheet<Value extends string>(
  props: SplitButtonProps<Value>,
): ReactNode {
  const { choices, value, onValueChange, disabled, menuLabel } = props;
  const [open, setOpen] = useState(false);
  if (disabled && open) setOpen(false);
  return (
    <ComposerSheet
      open={open}
      onOpenChange={setOpen}
      onClosed={ignoreClosed}
      label={menuLabel}
      trigger={chevron(props, false)}
    >
      <View className="gap-0.5 p-1">
        {choices.map((choice) => (
          <Button
            key={choice.value}
            variant="ghost"
            accessibilityState={{ selected: choice.value === value }}
            aria-selected={choice.value === value}
            className="h-auto min-h-11 justify-between rounded-sm px-2 py-1.5 sm:h-auto"
            onPress={() => {
              setOpen(false);
              onValueChange(choice.value);
            }}
          >
            <Text className="type-body">{choice.label}</Text>
            <View className="size-4 items-center justify-center">
              {choice.value === value && (
                <Icon name="check" size="sm" className="text-foreground" />
              )}
            </View>
          </Button>
        ))}
      </View>
    </ComposerSheet>
  );
}
