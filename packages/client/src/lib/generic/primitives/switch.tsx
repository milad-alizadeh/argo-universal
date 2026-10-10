import * as SwitchPrimitives from '@rn-primitives/switch';
import type * as React from 'react';
import { Platform } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { SwitchProps } from './switch-props';

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchProps): React.JSX.Element {
  return (
    <SwitchPrimitives.Root
      className={switchClass({ ...props, className, size })}
      {...props}
    >
      <SwitchThumb checked={props.checked} size={size} />
    </SwitchPrimitives.Root>
  );
}

function switchClass(props: SwitchProps): string {
  return cn(
    'flex shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5',
    props.size === 'small' ? 'h-4 w-6.5 p-0.5 border-0' : 'h-[1.15rem] w-8',
    Platform.select({
      web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
    }),
    switchStateClass(props),
    props.className,
  );
}

function switchStateClass(
  props: Pick<SwitchProps, 'checked' | 'disabled'>,
): string {
  return cn(
    props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
    props.disabled && 'opacity-50',
  );
}

function thumbClass(props: Pick<SwitchProps, 'checked' | 'size'>): string {
  return cn(
    'bg-background rounded-full transition-transform',
    props.size === 'small' ? 'size-3' : 'size-4',
    Platform.select({ web: 'pointer-events-none block ring-0' }),
    thumbPosition(props),
  );
}

function thumbPosition(props: Pick<SwitchProps, 'checked' | 'size'>): string {
  if (!props.checked) return 'dark:bg-foreground translate-x-0';
  return cn(
    'dark:bg-primary-foreground',
    props.size === 'small' ? 'translate-x-2.5' : 'translate-x-3.5',
  );
}

export { Switch };

function SwitchThumb(
  props: Pick<SwitchProps, 'checked' | 'size'>,
): React.JSX.Element {
  return <SwitchPrimitives.Thumb className={thumbClass(props)} />;
}
