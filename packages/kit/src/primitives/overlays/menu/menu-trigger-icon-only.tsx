import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { buttonInteractionProps } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';
import type { TriggerProps } from './menu-trigger';

const keys = [
  'label',
  'detail',
  'icon',
  'leading',
  'trailing',
  'tone',
  'iconOnly',
  'disabled',
] as const;

function nativeProps(props: TriggerProps): ComponentProps<typeof Pressable> {
  const handlers: Partial<TriggerProps> = { ...props };

  for (const key of keys) delete handlers[key];

  return handlers;
}

const ghostClass = cn(
  'min-w-0 shrink flex-row items-center justify-center h-11 w-11 android:h-12 android:w-12 web:h-7 web:w-7 web:rounded-full web:outline-none web:hover:bg-hover web:focus-visible:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
);

export function IconOnlyMenuTrigger(props: TriggerProps): ReactElement {
  return (
    <Pressable
      {...nativeProps(props)}
      {...buttonInteractionProps(props)}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      className={cn(ghostClass, props.disabled && 'opacity-35')}
    >
      <Leading {...props} />
    </Pressable>
  );
}

function Leading(props: TriggerProps): ReactElement | null {
  if (props.leading) return props.leading;

  return props.icon ? (
    <Icon name={props.icon} tone={iconTone(props.tone)} />
  ) : null;
}

const iconTone = (tone: TriggerProps['tone']): 'muted' | 'danger' =>
  tone ?? 'muted';
