import * as SwitchPrimitives from '@rn-primitives/switch';
import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import type { SwitchProps } from './switch-props';

function Switch(props: SwitchProps): React.JSX.Element {
  const size = props.size ?? 'md';

  return (
    <SwitchPrimitives.Root
      className={switchClass({ ...props, size })}
      checked={props.value}
      onCheckedChange={props.onValueChange}
      disabled={props.disabled}
      accessibilityLabel={props.accessibilityLabel}
      tabIndex={props.decorative ? -1 : undefined}
    >
      <SwitchThumb value={props.value} size={size} />
    </SwitchPrimitives.Root>
  );
}

function switchClass(props: SwitchProps): string {
  return cn(
    'flex shrink-0 flex-row items-center rounded-full border border-transparent shadow-control',
    props.size === 'sm'
      ? 'h-4 w-6.5 p-0.5 border-0'
      : 'h-5.5 w-9 p-0.5 border-0',
    'web:focus-visible:border-focus web:focus-visible:ring-focus/50 peer web:inline-flex web:outline-none web:transition-all web:focus-visible:ring-[3px] web:disabled:cursor-not-allowed',
    switchStateClass(props),
  );
}

function switchStateClass(
  props: Pick<SwitchProps, 'value' | 'disabled'>,
): string {
  return cn(
    props.value ? 'bg-primary' : 'bg-border',
    props.disabled && 'opacity-50',
  );
}

function thumbClass(props: Pick<SwitchProps, 'value' | 'size'>): string {
  return cn(
    'bg-card rounded-full transition-transform',
    props.size === 'sm' ? 'size-3' : 'size-4.5 shadow-control',
    'web:pointer-events-none web:block web:ring-0',
    thumbPosition(props),
  );
}

function thumbPosition(props: Pick<SwitchProps, 'value' | 'size'>): string {
  if (!props.value) return 'dark:bg-foreground translate-x-0';

  return cn(
    'dark:bg-primary-foreground',
    props.size === 'sm' ? 'translate-x-2.5' : 'translate-x-3.5',
  );
}

Switch satisfies React.ComponentType<SwitchProps>;

export { Switch };

function SwitchThumb(
  props: Pick<SwitchProps, 'value' | 'size'>,
): React.JSX.Element {
  return <SwitchPrimitives.Thumb className={thumbClass(props)} />;
}
