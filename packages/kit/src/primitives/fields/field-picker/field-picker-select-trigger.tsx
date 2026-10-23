import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import type { FieldPickerSelectProps } from './field-picker-select';

type TriggerProps = FieldPickerSelectProps & { onOpen: () => void };

/*
 * Radix names the trigger a combobox; the picker is read as a button. React Native Web's press handling replaces
 * Radix's click, which opens the select after a touch.
 */
export function SelectTrigger(props: TriggerProps): React.JSX.Element {
  return (
    <RadixSelect.Trigger asChild disabled={props.disabled}>
      <Pressable {...pressProps(props)}>
        <Label {...props} />
        <Chevron />
      </Pressable>
    </RadixSelect.Trigger>
  );
}

const pressProps = (props: TriggerProps): PressableProps => ({
  role: 'button',
  accessibilityLabel: props.title,
  disabled: props.disabled,
  className: cn(triggerClassName, props.disabled && 'opacity-50'),
  onPress: props.onOpen,
});

function Label(props: TriggerProps): React.JSX.Element {
  const chosen = props.options.find((option) => option.value === props.value);

  return (
    <RadixSelect.Value placeholder={chosen?.label} className={valueClass} />
  );
}

const valueClass = 'type-body line-clamp-1 flex flex-row items-center gap-2';

const Chevron = (): React.JSX.Element => (
  <Icon
    name="chevron-up-down"
    size="sm"
    aria-hidden={true}
    className="text-tertiary"
  />
);

const triggerClassName =
  'flex h-8 flex-row items-center gap-1.5 rounded-control pl-2 web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:w-fit web:whitespace-nowrap web:outline-none web:disabled:cursor-not-allowed';
