import type * as React from 'react';
import { type ReactElement, type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { ButtonGroup } from '#lib/generic/primitives/button-group';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { BottomSheet } from '../../../lib/generic/primitives/bottom-sheet';
import { Menu } from '../../../lib/generic/primitives/menu';
import { Icon } from '../../../lib/generic/symbols/icon';

interface SplitButtonChoice<Value extends string> {
  value: Value;
  label: string;
}

export interface SplitButtonProps<Value extends string> {
  // The button that acts on the chosen value; it passes className on to its Button.
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
    <ButtonGroup className={props.className}>
      {props.children}
      {wide ? <ChoiceDropdown {...props} /> : <ChoiceSheet {...props} />}
    </ButtonGroup>
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
  className: string | undefined,
): React.JSX.Element {
  return (
    <Button
      variant={primary ? 'default' : 'ghost'}
      accessibilityLabel={menuLabel}
      disabled={disabled}
      className={cn(
        wide ? 'h-8 w-7 px-0 sm:h-8' : 'h-11 w-11 rounded-lg px-0 sm:h-11',
        className,
      )}
    >
      <Icon
        name="chevron-down"
        className={
          primary ? 'text-primary-foreground' : 'text-muted-foreground'
        }
      />
    </Button>
  );
}

// ButtonGroup sets className on this child; the chevron takes it.
type ChoiceProps<Value extends string> = Omit<
  SplitButtonProps<Value>,
  'className'
> & { className?: string };

function ChoiceDropdown<Value extends string>(
  props: ChoiceProps<Value>,
): ReactNode {
  return (
    <Menu
      disabled={props.disabled}
      accessibilityLabel={props.menuLabel}
      value={props.value}
      choices={props.choices}
      onValueChange={props.onValueChange}
      trigger={chevron(props, true, props.className)}
    />
  );
}

function ChoiceSheet<Value extends string>(
  props: ChoiceProps<Value>,
): ReactNode {
  const { choices, value, onValueChange, disabled, menuLabel } = props;
  const [open, setOpen] = useState(false);
  if (disabled && open) setOpen(false);
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      label={menuLabel}
      trigger={chevron(props, false, props.className)}
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
            <Text role="body">{choice.label}</Text>
            <View className="size-4 items-center justify-center">
              {choice.value === value && (
                <Icon name="check" className="text-foreground" />
              )}
            </View>
          </Button>
        ))}
      </View>
    </BottomSheet>
  );
}
