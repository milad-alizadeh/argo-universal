import type { ComponentProps, ReactElement } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#lib/generic/motion';
import { cn } from '#lib/generic/utils';
import { buttonInteractionProps } from '#primitives/actions/button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { usePressRipple } from '#primitives/native/material-palette';
import type { MenuTriggerProps } from './menu-props';

// What the overlay it opens passes in: its press, hover and ARIA handlers and its ref.
type OverlayHandlers = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'style' | keyof MenuTriggerProps
>;

type TriggerProps = MenuTriggerProps & OverlayHandlers;

const triggerKeys = [
  'label',
  'labelRole',
  'icon',
  'leading',
  'trailing',
  'tone',
  'iconOnly',
  'variant',
  'size',
  'disabled',
  'accessibilityLabel',
  'testID',
] as const;

// iOS takes the pressed tint, as the kit's other drawn rows do; Android's Pressable draws the ripple in that tint.
const iosPressedTint = Platform.OS === 'ios' ? 'active:bg-pressed' : undefined;

/*
 * Desktop and the web draw it 28 high with a radius-control tint for hover, press and focus. Phones draw it at the
 * stock touch height (iOS 44, Android 48) with no hover or focus, and the stock press feedback.
 */
const triggerClassName = cn(
  'min-w-0 shrink flex-row items-center gap-1.5 h-11 android:h-12',
  'web:h-7 web:px-1.5 web:rounded-control web:outline-none web:hover:bg-hover web:focus-visible:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
  iosPressedTint,
);

const iconOnlyClassName = 'w-11 android:w-12 web:w-7 web:px-0 justify-center';

const variantClassNames = {
  default: '',
  toolbar: 'web:rounded-md',
} satisfies Record<NonNullable<MenuTriggerProps['variant']>, string>;

const sizeClassNames = {
  sm: '',
  md: 'web:h-8',
} satisfies Record<NonNullable<MenuTriggerProps['size']>, string>;

// A toolbar picker's corners and height; the defaults draw nothing extra.
function toolbarClass({
  variant = 'default',
  size = 'sm',
}: Pick<MenuTriggerProps, 'variant' | 'size'>): string {
  return cn(variantClassNames[variant], sizeClassNames[size]);
}

export function MenuTrigger(props: TriggerProps): ReactElement {
  return (
    <Pressable {...useTriggerPressableProps(props)}>
      <TriggerLeading {...props} />
      <TriggerText {...props} />
    </Pressable>
  );
}

function useTriggerPressableProps(
  props: TriggerProps,
): ComponentProps<typeof Pressable> {
  return {
    ...overlayHandlers(props),
    ...buttonInteractionProps({ disabled: props.disabled }),
    android_ripple: usePressRipple(),
    accessibilityLabel: props.accessibilityLabel ?? props.label,
    testID: props.testID,
    className: triggerClass(props),
  };
}

// The overlay's handlers, without the trigger's own props.
function overlayHandlers(props: TriggerProps): OverlayHandlers {
  const handlers: Partial<MenuTriggerProps> & OverlayHandlers = { ...props };

  for (const key of triggerKeys) delete handlers[key];

  return handlers;
}

function triggerClass(props: MenuTriggerProps): string {
  return cn(
    triggerClassName,
    toolbarClass(props),
    props.iconOnly && iconOnlyClassName,
    props.disabled && 'opacity-35',
  );
}

// Icons take the muted colour, or red beside a danger label.
function TriggerLeading(
  props: Pick<MenuTriggerProps, 'icon' | 'leading' | 'tone'>,
): ReactElement | null {
  if (props.leading) return props.leading;

  if (!props.icon) return null;

  return <Icon name={props.icon} role="control" tone={iconTone(props.tone)} />;
}

function iconTone(tone: MenuTriggerProps['tone']): 'danger' | 'muted' {
  return tone === 'danger' ? 'danger' : 'muted';
}

// Icon only, the label is read out but not shown, and the chevron goes.
function TriggerText(
  props: Pick<
    MenuTriggerProps,
    'label' | 'labelRole' | 'tone' | 'iconOnly' | 'trailing'
  >,
): ReactElement | null {
  if (props.iconOnly) return null;

  return (
    <>
      <TriggerLabel {...props} />
      {props.trailing}
      <TriggerChevron />
    </>
  );
}

function TriggerLabel(
  props: Pick<MenuTriggerProps, 'label' | 'labelRole' | 'tone'>,
): ReactElement {
  return (
    <Text
      role={props.labelRole ?? 'row'}
      tone={props.tone}
      numberOfLines={1}
      selectable={false}
      className="min-w-0 shrink web:select-none"
    >
      {props.label}
    </Text>
  );
}

// Sits 4 from the label: the 6 gap less 2.
function TriggerChevron(): ReactElement {
  return (
    <View className="-ml-0.5">
      <Icon name="chevron-down" role="chevron" tone="muted" />
    </View>
  );
}
