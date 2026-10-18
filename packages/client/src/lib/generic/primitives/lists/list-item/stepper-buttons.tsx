import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Button, type ButtonProps } from '#primitives/actions/button';
import type { ListItemStepperProps } from './list-item-stepper';

const stepVariant = Platform.OS === 'ios' ? 'outline' : 'ghost';

export function StepperButtons(
  props: ListItemStepperProps & { children?: ReactNode },
): ReactElement {
  return (
    <View className="flex-row items-center rounded-control bg-muted">
      <Button {...stepButton(props, -1)} />
      {props.children}
      <Button {...stepButton(props, 1)} />
    </View>
  );
}

function stepButton(
  props: ListItemStepperProps,
  direction: number,
): ButtonProps {
  const value = nextValue(props, direction);

  return {
    ...stepLabel(props.title, direction),
    variant: stepVariant,
    size: 'xs',
    disabled: props.disabled || value === props.value,
    onPress: () => props.onValueChange(value),
  };
}

function stepLabel(
  title: string,
  direction: number,
): Pick<ButtonProps, 'label' | 'accessibilityLabel'> {
  return direction < 0
    ? { label: '−', accessibilityLabel: `Decrease ${title}` }
    : { label: '+', accessibilityLabel: `Increase ${title}` };
}

function nextValue(props: ListItemStepperProps, direction: number): number {
  const { min, max } = limits(props);

  return Math.min(
    max,
    Math.max(min, props.value + direction * (props.step ?? 1)),
  );
}

type StepperLimits = { min: number; max: number };

function limits(props: ListItemStepperProps): StepperLimits {
  return { min: props.min ?? -Infinity, max: props.max ?? Infinity };
}
