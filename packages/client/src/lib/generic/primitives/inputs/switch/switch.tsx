import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { SwitchProps } from './switch-props';

// React Native's types leave out the web's keyboard handler, which React Native Web passes to the element.
type SwitchWebProps = React.ComponentProps<typeof Pressable> & {
  onKeyDown: React.KeyboardEventHandler;
};

/*
 * The web's switch, drawn by Argo on the ARIA switch pattern: role `switch`, `aria-checked`, a press or Space
 * toggles it. React Native Web presses on Enter for every role but on Space only for buttons, so Space is
 * handled here.
 */
function Switch(props: SwitchProps): React.JSX.Element {
  const size = props.size ?? 'md';
  const toggle = (): void => props.onValueChange(!props.value);

  return (
    <Pressable
      {...switchState(props, toggle)}
      className={switchClass({ ...props, size })}
      onPress={toggle}
    >
      <View role="presentation" className={thumbClass({ ...props, size })} />
    </Pressable>
  );
}

function switchState(props: SwitchProps, toggle: () => void): SwitchWebProps {
  return {
    onKeyDown: spaceToggles(toggle, props.disabled),
    role: 'switch',
    disabled: props.disabled,
    'aria-checked': props.value,
    'aria-disabled': props.disabled,
    accessibilityState: { checked: props.value, disabled: props.disabled },
    accessibilityLabel: props.accessibilityLabel,
    tabIndex: props.decorative ? -1 : undefined,
  };
}

function spaceToggles(
  toggle: () => void,
  disabled: boolean | undefined,
): React.KeyboardEventHandler {
  return (event) => {
    if (!isOwnSpace(event)) return;
    // The page would scroll on Space.
    event.preventDefault();

    if (canToggle(disabled, event.repeat)) toggle();
  };
}

function canToggle(disabled: boolean | undefined, repeat: boolean): boolean {
  return !disabled && !repeat;
}

function isOwnSpace(event: React.KeyboardEvent): boolean {
  return event.key === ' ' && event.target === event.currentTarget;
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
