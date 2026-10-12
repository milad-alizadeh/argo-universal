import * as SelectPrimitive from '@rn-primitives/select';
import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { Icon, IconSlot } from '../../../symbols/icon';
import type { IconName } from '../../../symbols/icon-names';
import { useWide } from '../../../use-wide/use-wide';
import { SelectedCheck } from '../../display/selected-check';
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
        'type-body line-clamp-1 flex flex-row items-center gap-2',
        !value && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

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

function SelectTrigger(triggerProps: TriggerProps): React.JSX.Element {
  const { className, children, size, variant, ...props } = triggerProps;
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
      className={cn('type-secondary px-2 py-2 sm:py-1.5', className)}
      {...props}
    />
  );
}

function ItemIndicator(): React.JSX.Element {
  return (
    <IconSlot role="control" className="absolute right-2">
      <SelectPrimitive.ItemIndicator>
        <SelectedCheck className="text-muted-foreground shrink-0" />
      </SelectPrimitive.ItemIndicator>
    </IconSlot>
  );
}

function SelectItem({ className, ...props }: ItemProps): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      className={selectItemClassName({ className, disabled: props.disabled })}
      {...props}
    >
      <ItemIndicator />
      <SelectPrimitive.ItemText className="type-body group-active:text-accent-foreground select-none" />
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
