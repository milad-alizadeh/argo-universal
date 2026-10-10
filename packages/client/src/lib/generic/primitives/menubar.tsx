import * as MenubarPrimitive from '@rn-primitives/menubar';
import { Portal } from '@rn-primitives/portal';
import * as React from 'react';
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { Icon } from '#lib/generic/primitives/icon';
import { NativeOnlyAnimatedView } from '#lib/generic/primitives/native-only-animated-view';
import { TextClassContext } from '#lib/generic/primitives/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import { disabledMenuItemClassName, menuItemClassName } from './menu-styles';

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function Menubar({
  className,
  value: valueProp,
  onValueChange: onValueChangeProp,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  const id = React.useId();
  const [value, setValue] = React.useState<string | undefined>(undefined);

  function closeMenu() {
    if (onValueChangeProp) {
      onValueChangeProp(undefined);
      return;
    }
    setValue(undefined);
  }

  return (
    <>
      {Platform.OS !== 'web' && (value || valueProp) ? (
        <Portal name={`menubar-overlay-${id}`}>
          <Pressable onPress={closeMenu} style={StyleSheet.absoluteFill} />
        </Portal>
      ) : null}
      <MenubarPrimitive.Root
        className={cn(
          'bg-background border-border flex h-10 flex-row items-center gap-1 rounded-md border p-1 shadow-sm shadow-black/5 sm:h-9',
          className,
        )}
        value={value ?? valueProp}
        onValueChange={onValueChangeProp ?? setValue}
        {...props}
      />
    </>
  );
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  const { value } = MenubarPrimitive.useRootContext();
  const { value: itemValue } = MenubarPrimitive.useMenuContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium select-none group-active:text-accent-foreground',
        value === itemValue && 'text-accent-foreground',
      )}
    >
      <MenubarPrimitive.Trigger
        className={cn(
          'group flex items-center rounded-md px-2 py-1.5 sm:py-1',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none',
          }),
          value === itemValue && 'bg-accent',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  children?: React.ReactNode;
  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = MenubarPrimitive.useSubContext();
  let icon: IconName = 'chevron-down';
  if (Platform.OS === 'web') icon = 'chevron-right';
  else if (open) icon = 'chevron-up';
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground',
      )}
    >
      <MenubarPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center justify-between rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8',
        )}
        {...props}
      >
        <>{children}</>
        <Icon
          size="sm"
          name={icon}
          className={cn('text-foreground shrink-0', iconClassName)}
        />
      </MenubarPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)}>
      <MenubarPrimitive.SubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
          }),
          className,
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

function MenubarContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
}) {
  return (
    <MenubarPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <NativeOnlyAnimatedView
          as="Pressable"
          accessible={false}
          entering={FadeIn.reduceMotion(ReduceMotion.System)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <TextClassContext.Provider value="text-popover-foreground">
            <MenubarPrimitive.Content
              className={cn(
                'bg-popover border-border min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                Platform.select({
                  web: cn(
                    'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
                    props.side === 'bottom' && 'slide-in-from-top-2',
                    props.side === 'top' && 'slide-in-from-bottom-2',
                  ),
                }),
                className,
              )}
              align={align}
              alignOffset={alignOffset}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </FullWindowOverlay>
    </MenubarPrimitive.Portal>
  );
}

function MenubarItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' &&
          'text-destructive group-active:text-destructive',
      )}
    >
      <MenubarPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              menuItemClassName,
              variant === 'destructive' &&
                'focus:bg-destructive/10 dark:focus:bg-destructive/20',
            ),
          }),
          variant === 'destructive' &&
            'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && disabledMenuItemClassName,
          inset && 'pl-8',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: menuItemClassName,
          }),
          props.disabled && disabledMenuItemClassName,
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex size-icon-md items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Icon
              name="check"
              className={cn(
                'text-foreground',
                Platform.select({ web: 'pointer-events-none' }),
              )}
            />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
  children?: React.ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: menuItemClassName,
          }),
          props.disabled && disabledMenuItemClassName,
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex size-icon-md items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
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
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
