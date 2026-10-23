import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import { Menu, type MenuAction } from '#primitives/overlays/menu';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import type { KitProps } from '../../kit-props';
import { actingButton, menuRows, stackedButtons } from './split-button-items';
import { SplitChevron } from './split-chevron';

type Derived<Value extends string> = KitProps<'SplitButton', Value>;

type Choices<Value extends string> = Extract<
  Derived<Value>,
  { options: readonly unknown[] }
>;

export type SplitButtonOption<Value extends string> =
  Choices<Value>['options'][number];

// Kit-only: Argo's own callers pass menu actions as data, with custom web content.
export type SplitButtonProps<Value extends string = string> = Derived<Value> & {
  actions?: readonly MenuAction[];
  children?: ReactNode;
};

// What the split offers besides its button: the choices, or the actions.
export type SplitRows<Value extends string = string> =
  | Pick<Choices<Value>, 'options' | 'value' | 'onValueChange'>
  | { actions: readonly MenuAction[] };

// The split's props once its width is resolved: `narrow` fills the row.
export type LaidSplitProps<Value extends string = string> =
  SplitButtonProps<Value> & { narrow: boolean };

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
    <View className={cn('flex-row gap-0.5', props.narrow && 'w-full')}>
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

// The acting segment keeps the Button's radius on its start side and a small one beside the chevron.
const acting = <Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement => <Button {...actingButton(props)} joined="start" />;

const chevron = <Value extends string>(
  props: LaidSplitProps<Value>,
): ReactElement => (
  <SplitChevron
    primary={props.primary === true}
    size={props.size === 'xs' ? 'sm' : 'md'}
    accessibilityLabel={props.menuLabel}
    disabled={props.disabled}
  />
);

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
