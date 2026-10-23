import { type ReactElement, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import { IconButton } from '#primitives/actions/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import { actingButton, menuRows, stackedButtons } from './split-button-items';
import type { LaidSplitProps, SplitButtonProps } from './split-button-props';

export type { SplitButtonOption, SplitButtonProps } from './split-button-props';

// The web draws a button beside a chevron that opens Argo's menu; phones stack every option as a button of its own.
export function SplitButton<Value extends string>(
  props: SplitButtonProps<Value>,
): ReactElement {
  const laid = { ...props, narrow: useNarrowLayout(props.fullWidth) };

  if (Platform.OS === 'web') return <MenuSplit {...laid} />;

  return <StackedSplit {...laid} />;
}

// Full width always, or "narrow" on a compact window only, as Button's fullWidth.
function useNarrowLayout(fullWidth: SplitButtonProps['fullWidth']): boolean {
  const compact = useSizeClassValue({ compact: true, wide: false });

  return fullWidth === true || (fullWidth === 'narrow' && compact);
}

function MenuSplit<Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement {
  return (
    <View className={cn('flex-row gap-1', props.narrow && 'w-full')}>
      <View className={cn(props.narrow && 'flex-1')}>{acting(props)}</View>
      <Menu
        {...menuRows(props)}
        disabled={props.disabled}
        accessibilityLabel={props.menuLabel}
        trigger={chevron(props)}
      />
    </View>
  );
}

const acting = <Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement => <Button {...actingButton(props)} />;

// An IconButton element itself, in the split's look and size, so the menu's asChild trigger can pass its press handlers to it.
function chevron<Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement {
  return (
    <IconButton
      icon="chevron-down"
      variant={props.primary ? 'primary' : 'secondary'}
      size={props.size === 'xs' ? 'sm' : 'md'}
      accessibilityLabel={props.menuLabel}
      disabled={props.disabled}
    />
  );
}

function StackedSplit<Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement {
  const choose = useChooseThenPress(props);

  return (
    <View className={cn('gap-2', props.narrow ? 'w-full' : 'items-start')}>
      {stackedButtons(props, choose).map((button) => (
        <Button key={button.label} {...button} />
      ))}
    </View>
  );
}

/*
 * A stacked choice picks itself, then acts once the caller has taken the new value,
 * so the press reads the chosen value rather than the one before it.
 */
function useChooseThenPress<Value extends string>(
  props: LaidSplitProps<Value>,
): (value: Value) => void {
  const { value, onPress = noop } = props;
  const pressWhenChosen = usePressWhenChosen(value, onPress);

  return (next) => {
    if (next === value) return onPress();
    pressWhenChosen(next);
    props.onValueChange?.(next);
  };
}

function usePressWhenChosen<Value extends string>(
  value: Value | undefined,
  onPress: () => void,
): (next: Value) => void {
  const pending = useRef<{ value: Value } | null>(null);

  useEffect(() => {
    const waiting = pending.current;

    if (!waiting || waiting.value !== value) return;
    pending.current = null;
    onPress();
  }, [value, onPress]);

  return (next) => {
    pending.current = { value: next };
  };
}

const noop = (): void => undefined;
