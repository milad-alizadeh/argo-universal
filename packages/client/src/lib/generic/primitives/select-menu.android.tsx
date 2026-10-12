import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '../symbols/icon';
import { useInListItem } from './list-item-accessory';
import { Menu } from './menu';
import type { SelectMenuProps } from './select-menu';
import { type SelectVariant, selectTriggerClassName } from './select-styles';
import { Text } from './text';

const unchosen = '';

// The popup is Menu's native Compose dropdown; the trigger is drawn here to match the web select.
export function SelectMenu<Value extends string>(
  props: SelectMenuProps<Value>,
): React.JSX.Element {
  const variant = useSelectVariant(props);
  const chosen = props.options.find((option) => option.value === props.value);
  return (
    <Menu<Value | typeof unchosen>
      accessibilityLabel={props.accessibilityLabel}
      value={chosen?.value ?? unchosen}
      choices={props.options}
      disabled={props.disabled}
      onValueChange={(next) => {
        if (next !== unchosen) props.onValueChange(next);
      }}
      trigger={
        <SelectTrigger
          label={triggerLabel(chosen, props.placeholder)}
          chosen={chosen !== undefined}
          variant={variant}
          disabled={props.disabled}
          invalid={props.invalid}
        />
      }
    />
  );
}

function useSelectVariant(
  props: Pick<SelectMenuProps<string>, 'variant'>,
): SelectVariant {
  const inListItem = useInListItem();
  return props.variant ?? (inListItem ? 'plain' : 'default');
}

function triggerLabel(
  chosen: { label: string } | undefined,
  placeholder: string | undefined,
): string {
  return chosen ? chosen.label : (placeholder ?? 'Choose…');
}

function triggerClassName(
  variant: SelectVariant,
  invalid: boolean | undefined,
): string | undefined {
  if (variant === 'plain') return undefined;
  return cn('h-9', invalid && 'border-destructive');
}

function SelectTrigger(props: {
  label: string;
  chosen: boolean;
  variant: SelectVariant;
  disabled?: boolean;
  invalid?: boolean;
}): React.JSX.Element {
  return (
    <View
      className={selectTriggerClassName({
        variant: props.variant,
        disabled: props.disabled,
        className: triggerClassName(props.variant, props.invalid),
      })}
    >
      <Text
        role="control"
        numberOfLines={1}
        className={props.chosen ? undefined : 'text-muted-foreground'}
      >
        {props.label}
      </Text>
      <TriggerChevron variant={props.variant} />
    </View>
  );
}

function TriggerChevron({
  variant,
}: {
  variant: SelectVariant;
}): React.JSX.Element {
  return (
    <Icon
      size="xs"
      name={variant === 'plain' ? 'chevron-up-down' : 'chevron-down'}
      aria-hidden={true}
      className="text-muted-foreground"
    />
  );
}
