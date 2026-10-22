import type { ComponentProps, ReactElement } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { buttonInteractionProps } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
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
  'size',
  'disabled',
  'accessibilityLabel',
  'testID',
] as const;

/*
 * Desktop and the web draw it 28 high, its hover, press and focus a pill around the words it says: the trigger is
 * already its content's size there, so it lights up itself. Phones draw it at the stock touch height (iOS 44,
 * Android 48) with no hover or focus; what lights up there is the pill below, not the whole touch box, so the
 * trigger keeps its reach without a block of tint around a few words (owner, 2026-10-20).
 */
const triggerClassName = cn(
  'group min-w-0 shrink flex-row items-center h-11 android:h-12',
  'web:h-7 web:px-2 web:rounded-full web:outline-none web:hover:bg-hover web:focus-visible:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
);

/*
 * The phones' press: a pill the size of what the trigger says. Its padding is pulled straight back out again, so
 * the label keeps the place it has in the row and only the tint is wider than the words. The web's own tint is on
 * the trigger, which is already its content's size there, so the pill draws nothing.
 */
const pillClassName =
  Platform.OS === 'web'
    ? ''
    : cn('-mx-2 rounded-full px-2 py-1', tintTransitionClassName);

const triggerPillClassName = cn(
  'min-w-0 shrink flex-row items-center gap-1.5',
  pillClassName,
);

// A group variant does not reach a child on the phones, so the pill reads the press Pressable hands it.
const pillClass = (pressed: boolean): string =>
  cn(triggerPillClassName, pressed && Platform.OS !== 'web' && 'bg-pressed');

const iconOnlyClassName = 'w-11 android:w-12 web:w-7 web:px-0 justify-center';

const sizeClassNames = {
  sm: '',
  md: 'web:h-8',
} satisfies Record<NonNullable<MenuTriggerProps['size']>, string>;

// A taller picker, such as the Composer's; the default draws nothing extra.
function toolbarClass({ size = 'sm' }: Pick<MenuTriggerProps, 'size'>): string {
  return sizeClassNames[size];
}

export function MenuTrigger(props: TriggerProps): ReactElement {
  return (
    <Pressable {...useTriggerPressableProps(props)}>
      {({ pressed }) => (
        <View className={pillClass(pressed)}>
          <TriggerLeading {...props} />
          <TriggerText {...props} />
        </View>
      )}
    </Pressable>
  );
}

function useTriggerPressableProps(
  props: TriggerProps,
): ComponentProps<typeof Pressable> {
  return {
    ...overlayHandlers(props),
    ...buttonInteractionProps({ disabled: props.disabled }),
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
