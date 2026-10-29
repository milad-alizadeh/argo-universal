import { pillDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { buttonInteractionProps } from '#primitives/actions/pressable';
import { LiquidGlass } from '#primitives/content/liquid-glass';
import { PillControlContent } from './pill-control-content';
import { pillContentClass, pillTouchClass } from './pill-geometry';
import type { PillProps } from './pill-props';

const ownKeys = [
  'text',
  'variant',
  'appearance',
  'tone',
  'color',
  'icon',
  'count',
  'countTone',
  'detail',
  'disclosure',
  'iconOnly',
  'fill',
  'selected',
  'disabled',
  'leading',
  'trailing',
] as const;

function nativeHandlers(props: PillProps): ComponentProps<typeof Pressable> {
  const handlers: Partial<PillProps> = { ...props };

  for (const key of ownKeys) delete handlers[key];

  return handlers;
}

function pressProps(
  props: PillProps,
): ComponentProps<typeof Pressable> & { 'aria-pressed'?: boolean } {
  return {
    ...nativeHandlers(props),
    ...controlInteraction(props),
    accessibilityLabel: props.accessibilityLabel ?? props.text,
    'aria-pressed': props.selected,
    className: cn(pillTouchClass(props), props.disabled && 'opacity-35'),
  };
}

export function PillControl(props: PillProps): ReactElement {
  return (
    <Pressable {...pressProps(props)}>
      {({ pressed }) => <ControlSurface {...props} pressed={pressed} />}
    </Pressable>
  );
}

function ControlSurface(props: PillProps & { pressed: boolean }): ReactElement {
  const content = (
    <View className={surfaceContentClass(props)}>
      <PillControlContent {...props} />
    </View>
  );

  return props.appearance === 'glass' ? (
    <GlassControlSurface fill={props.fill}>{content}</GlassControlSurface>
  ) : (
    content
  );
}

type GlassControlProps = Pick<PillProps, 'fill'> & { children: ReactElement };

function GlassControlSurface({
  children,
  fill,
}: GlassControlProps): ReactElement {
  return (
    <LiquidGlass
      corners="pill"
      interactive
      inherit
      className={cn('min-w-0 max-w-full shrink', fill && 'w-full')}
    >
      {children}
    </LiquidGlass>
  );
}

const appearanceClass = {
  plain: 'bg-hover wide:bg-transparent',
  glass: 'border-border',
} as const;

function surfaceContentClass(props: PillProps & { pressed: boolean }): string {
  return cn(
    pillContentClass(props),
    appearanceClass[props.appearance ?? pillDefaults.appearance],
    tintTransitionClassName,
    interactionClass(props),
  );
}

function interactionClass({
  disabled,
  selected,
  pressed,
}: PillProps & { pressed: boolean }): string {
  return cn(
    !disabled &&
      'web:group-hover:bg-hover web:group-focus-visible:ring-2 web:group-focus-visible:ring-focus',
    stateClass(selected, pressed),
  );
}

const stateClass = (selected: boolean | undefined, pressed: boolean): string =>
  cn(selected && 'bg-selected', pressed && 'bg-pressed');

function controlInteraction(
  props: PillProps,
): ReturnType<typeof buttonInteractionProps> {
  return buttonInteractionProps({
    disabled: props.disabled,
    accessibilityState: {
      ...props.accessibilityState,
      selected: props.selected,
    },
  });
}
