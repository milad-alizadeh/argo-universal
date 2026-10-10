import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import { Platform, Text, View } from 'react-native';
import { cn } from '#lib/utils';
import { Icon } from '#primitives/icon';
import { TextClassContext } from '#primitives/text';
import { DropdownMenuContent } from './dropdown-menu-content';
import {
  dropdownItemClassName,
  dropdownItemTextClassName,
} from './dropdown-menu-styles';
import {
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu-sub';

type ItemProps = React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
};
type RadioProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
> & { children?: React.ReactNode };
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const indicatorClassName = cn(
  'text-foreground',
  Platform.select({ web: 'pointer-events-none' }),
);

function DropdownMenuItem(itemProps: ItemProps): React.JSX.Element {
  const { className, inset, variant, ...props } = itemProps;
  const itemStyle = dropdownItemClassName({
    className,
    inset,
    variant,
    disabled: props.disabled,
  });
  return (
    <TextClassContext.Provider value={dropdownItemTextClassName(variant)}>
      <DropdownMenuPrimitive.Item className={itemStyle} {...props} />
    </TextClassContext.Provider>
  );
}

function RadioIndicator(): React.JSX.Element {
  return (
    <View className="size-icon-md items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Icon name="check" size="sm" className={indicatorClassName} />
      </DropdownMenuPrimitive.ItemIndicator>
    </View>
  );
}

function RadioBody(radioProps: RadioProps): React.JSX.Element {
  const { className, children, ...props } = radioProps;
  const radioStyle = dropdownItemClassName({
    className,
    disabled: props.disabled,
  });
  return React.createElement(
    DropdownMenuPrimitive.RadioItem,
    { ...props, className: radioStyle },
    <View className="min-w-0 flex-1">{children}</View>,
    <RadioIndicator />,
  );
}

function DropdownMenuRadioItem(props: RadioProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <RadioBody {...props} />
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}): React.JSX.Element {
  const labelStyle = cn(
    'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
    inset && 'pl-8',
    className,
  );
  return <DropdownMenuPrimitive.Label className={labelStyle} {...props} />;
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<
  typeof DropdownMenuPrimitive.Separator
>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>): React.JSX.Element {
  return (
    <Text
      className={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
