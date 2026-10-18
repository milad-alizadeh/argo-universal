import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, IconSlot } from '#primitives/content/icon';
import { SelectedCheck } from '#primitives/status/selected-check';
import type { IconName } from '../../../symbols/icon-names';
import { useWide } from '../../../use-wide/use-wide';
import { SelectContent } from './picker-select-content';
import { Select, SelectValue, useSelectState } from './picker-select-root';
import {
  type SelectVariant,
  selectItemClassName,
  selectTriggerClassName,
} from './picker-select-styles';

type TriggerProps = {
  className?: string;
  children?: React.ReactNode;
  size?: 'default' | 'sm';
  variant?: SelectVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

type ItemProps = {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
};

// A plain picker on a phone row reads like a navigation row (Paper 2V85).
function chevronName(
  variant: TriggerProps['variant'],
  wide: boolean,
): IconName {
  if (variant !== 'plain') return 'chevron-down';

  return wide ? 'chevron-up-down' : 'chevron-right';
}

function TriggerChevron({
  variant,
}: Pick<TriggerProps, 'variant'>): React.JSX.Element {
  return (
    <Icon
      name={chevronName(variant, useWide())}
      role="body"
      aria-hidden={true}
      className="text-muted-foreground"
    />
  );
}

// Radix names the trigger a combobox; Argo's Picker is read as a button, as before.
function SelectTrigger(props: TriggerProps): React.JSX.Element {
  return (
    <RadixSelect.Trigger asChild disabled={props.disabled}>
      <Pressable {...useTriggerProps(props)}>
        {props.children}
        <TriggerChevron variant={props.variant} />
      </Pressable>
    </RadixSelect.Trigger>
  );
}

// React Native's types leave out these ARIA attributes, which React Native Web draws.
type TriggerWebProps = React.ComponentProps<typeof Pressable> &
  Pick<TriggerProps, 'aria-invalid' | 'aria-describedby'>;

function useTriggerProps(props: TriggerProps): TriggerWebProps {
  const { onOpenChange } = useSelectState();

  return {
    role: 'button',
    disabled: props.disabled,
    accessibilityLabel: props.accessibilityLabel,
    'aria-invalid': props['aria-invalid'],
    'aria-describedby': props['aria-describedby'],
    className: selectTriggerClassName(props),
    // React Native Web's press handling replaces Radix's click, which opens the select after a touch.
    onPress: () => onOpenChange(true),
  };
}

function ItemIndicator(): React.JSX.Element {
  return (
    <IconSlot role="control" className="absolute right-2">
      <RadixSelect.ItemIndicator asChild>
        <View>
          <SelectedCheck className="text-muted-foreground shrink-0" />
        </View>
      </RadixSelect.ItemIndicator>
    </IconSlot>
  );
}

function SelectItem({ className, ...props }: ItemProps): React.JSX.Element {
  return (
    <RadixSelect.Item
      value={props.value}
      textValue={props.label}
      disabled={props.disabled}
      className={selectItemClassName({ className, disabled: props.disabled })}
    >
      <ItemIndicator />
      <RadixSelect.ItemText asChild>
        <Text className="type-body select-none">{props.label}</Text>
      </RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
