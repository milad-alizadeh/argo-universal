import * as SelectPrimitive from '@rn-primitives/select';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon, iconSizeStyle } from '../symbols/icon';
import { SelectContent } from './select-content';
import {
  type SelectVariant,
  selectItemClassName,
  selectTriggerClassName,
} from './select-styles';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
type TriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
  variant?: SelectVariant;
};
type ValueProps = React.ComponentProps<typeof SelectPrimitive.Value> & {
  className?: string;
};
type ItemProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Item>,
  'children'
>;

function SelectValue({ className, ...props }: ValueProps): React.JSX.Element {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      className={cn(
        'text-foreground line-clamp-1 flex flex-row items-center gap-2 text-sm',
        !value && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TriggerChevron({
  variant,
}: Pick<TriggerProps, 'variant'>): React.JSX.Element {
  return (
    <Icon
      size="xs"
      name={variant === 'plain' ? 'chevron-up-down' : 'chevron-down'}
      aria-hidden={true}
      className="text-muted-foreground"
    />
  );
}

function SelectTrigger(triggerProps: TriggerProps): React.JSX.Element {
  const {
    className,
    children,
    size,
    variant = 'default',
    ...props
  } = triggerProps;
  const triggerStyle = selectTriggerClassName({
    className,
    size,
    variant,
    disabled: props.disabled,
  });
  return (
    <SelectPrimitive.Trigger className={triggerStyle} {...props}>
      {children}
      <TriggerChevron variant={variant} />
    </SelectPrimitive.Trigger>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>): React.JSX.Element {
  return (
    <SelectPrimitive.Label
      className={cn(
        'text-muted-foreground px-2 py-2 text-xs sm:py-1.5',
        className,
      )}
      {...props}
    />
  );
}

function ItemIndicator(): React.JSX.Element {
  return (
    <View
      style={iconSizeStyle('sm')}
      className="absolute right-2 flex items-center justify-center"
    >
      <SelectPrimitive.ItemIndicator>
        <Icon name="check" className="text-muted-foreground shrink-0" />
      </SelectPrimitive.ItemIndicator>
    </View>
  );
}

function SelectItem({ className, ...props }: ItemProps): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      className={selectItemClassName({ className, disabled: props.disabled })}
      {...props}
    >
      <ItemIndicator />
      <SelectPrimitive.ItemText className="text-foreground group-active:text-accent-foreground select-none text-sm" />
    </SelectPrimitive.Item>
  );
}
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
};
