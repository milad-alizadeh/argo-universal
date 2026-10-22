import type { LegendListProps } from '@legendapp/list/react-native';
import { useCallback, type Ref } from 'react';
import type { ScrollViewInstance } from 'react-native';

export const assignRef = <T>(
  ref: Ref<T> | undefined,
  instance: T | null,
): void => {
  if (typeof ref === 'function') ref(instance);
  else if (ref) ref.current = instance;
};

type LegendScrollRef = LegendListProps<unknown>['refScrollView'];

type LegendScrollTarget = Parameters<
  Extract<LegendScrollRef, (instance: never) => void>
>[0];

type Attach = ((view: ScrollViewInstance | null) => void) | undefined;

// Legend List types its scroll ref with the ScrollView component, not React Native 0.88's instance type.
function isScrollViewInstance<T>(
  value: T,
): value is T & (ScrollViewInstance | null) {
  return typeof value === 'object';
}

function attachTo(attach: Attach, instance: LegendScrollTarget): void {
  if (attach && isScrollViewInstance(instance)) attach(instance);
}

export function useLegendScrollRef(
  attach: Attach,
  user: LegendScrollRef,
): LegendScrollRef {
  return useCallback(
    (instance: LegendScrollTarget) => {
      attachTo(attach, instance);
      assignRef(user, instance);
    },
    [attach, user],
  );
}
