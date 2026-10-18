import type { Handler } from '@repo/contracts/plugins/wire';
import { useState } from 'react';
import {
  useControlValue,
  deliverControl,
  type ControlValue,
} from './plugin-control-state';
import type { RenderContext } from './plugin-rendering';

type Value = boolean | string | number | undefined;

type Input<T> = { value: T; disabled?: boolean; onValueChange?: Handler };

type Control<T> = {
  value: T;
  disabled?: boolean;
  onValueChange: (next: Exclude<T, undefined>) => void;
};

export function useValueControl<T extends Value>(
  props: Input<T>,
  context: RenderContext,
): Control<T> {
  const state = useControlValue(props.value);

  return {
    value: state.value,
    disabled: props.disabled || state.pending,
    onValueChange: changedValue(state, props, context),
  };
}

function changedValue<T extends Value>(
  state: ControlValue<T>,
  props: Input<T>,
  context: RenderContext,
): Control<T>['onValueChange'] {
  return (value) => {
    void state.change(value, () =>
      deliverControl(
        props.onValueChange,
        { event: 'onValueChange', payload: value },
        context,
      ),
    );
  };
}

type Draft<T> = { value: T; change: (next: Exclude<T, undefined>) => void };

export function useDraft<T extends string | number | undefined>(
  initial: T,
  deliver: (value: Exclude<T, undefined>) => void,
): Draft<T> {
  const [value, setValue] = useState(initial);

  const change = (next: Exclude<T, undefined>): void => {
    setValue(next);
    deliver(next);
  };

  return { value, change };
}

export function sendControl(
  handler: Handler | undefined,
  context: RenderContext,
): (value: string | number | boolean) => void {
  return (value) => {
    void Promise.resolve(
      deliverControl(
        handler,
        { event: 'onValueChange', payload: value },
        context,
      ),
    ).catch(() => {});
  };
}
