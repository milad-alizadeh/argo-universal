import {
  useContext,
  useEffect,
  useLayoutEffect,
  type EffectCallback,
  type DependencyList,
} from 'react';
import { QueryViewContext } from './use-data';

type RunInView = <T>(viewId: string | null, run: () => T) => T;

let runInView: RunInView = (_viewId, run) => run();

export function configureViewScope(run: RunInView): void {
  runInView = run;
}

export const withView: RunInView = (viewId, run) => runInView(viewId, run);

/*
 * React may flush several roots in one scheduler task. Bind each effect to its own view,
 * then AsyncLocalStorage preserves that view across its awaited Plugin API calls.
 */
function scopedEffect(effect: typeof useEffect): typeof useEffect {
  return (callback: EffectCallback, dependencies?: DependencyList): void => {
    const viewId = useContext(QueryViewContext);
    effect(() => withView(viewId, callback), dependencies);
  };
}

export const viewEffects = {
  useEffect: scopedEffect(useEffect),
  useLayoutEffect: scopedEffect(useLayoutEffect),
};
