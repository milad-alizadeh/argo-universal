import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import { Platform } from 'react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Icon } from '#lib/generic/primitives/icon';
import { NativeOnlyAnimatedView } from '#lib/generic/primitives/native-only-animated-view';
import { TextClassContext } from '#lib/generic/primitives/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import {
  dropdownSubContentClassName,
  dropdownSubTriggerClassName,
} from './dropdown-menu-styles';

type TriggerProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
> & {
  children?: React.ReactNode;
  iconClassName?: string;
  inset?: boolean;
};
const entering = FadeIn.reduceMotion(ReduceMotion.System);

function subTriggerIcon(open: boolean): IconName {
  if (Platform.OS === 'web') return 'chevron-right';
  return open ? 'chevron-up' : 'chevron-down';
}

function SubTriggerChevron({
  open,
  iconClassName,
}: Pick<TriggerProps, 'iconClassName'> & { open: boolean }): React.JSX.Element {
  return (
    <Icon
      name={subTriggerIcon(open)}
      className={cn('text-foreground shrink-0', iconClassName)}
    />
  );
}

type OpenTriggerProps = TriggerProps & { open: boolean };

function primitiveTriggerProps(
  triggerProps: Omit<OpenTriggerProps, 'iconClassName'>,
): React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> {
  const { className, inset, open, ...props } = triggerProps;
  return {
    ...props,
    className: dropdownSubTriggerClassName({ className, inset, open }),
  };
}

function SubTriggerBody(subProps: OpenTriggerProps): React.JSX.Element {
  const { iconClassName, ...props } = subProps;
  return React.createElement(
    DropdownMenuPrimitive.SubTrigger,
    primitiveTriggerProps(props),
    props.children,
    <SubTriggerChevron open={props.open} iconClassName={iconClassName} />,
  );
}

export function DropdownMenuSubTrigger(props: TriggerProps): React.JSX.Element {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const textStyle = cn(
    'text-sm select-none group-active:text-accent-foreground',
    open && 'text-accent-foreground',
  );
  return (
    <TextClassContext.Provider value={textStyle}>
      <SubTriggerBody {...props} open={open} />
    </TextClassContext.Provider>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<
  typeof DropdownMenuPrimitive.SubContent
>): React.JSX.Element {
  return (
    <NativeOnlyAnimatedView entering={entering}>
      <DropdownMenuPrimitive.SubContent
        className={cn(dropdownSubContentClassName, className)}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}
