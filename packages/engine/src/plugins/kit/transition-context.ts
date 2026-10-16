import type { TransitionContext } from './host-types';

// Only form actions read it, which Plugin pages do not have; the reconciler still expects one.
export function transitionContext(): TransitionContext {
  const context: TransitionContext = {
    $$typeof: Symbol.for('react.context'),
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0,
    get Consumer() {
      return context;
    },
    get Provider() {
      return { $$typeof: Symbol.for('react.provider'), _context: context };
    },
  };

  return context;
}
