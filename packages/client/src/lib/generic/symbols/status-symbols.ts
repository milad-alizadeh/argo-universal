import type { NativeSymbol } from './native-symbol';

// Outcomes and states a row or mark reports.
export const statusSymbols = {
  cancelled: { sf: 'stop', material: 'stop' },
  error: { sf: 'exclamationmark.circle', material: 'error' },
  failed: {
    sf: 'xmark.circle',
    sfFilled: 'xmark.circle.fill',
    material: 'cancel',
  },
  info: { sf: 'info.circle', material: 'info' },
  merged: { sf: 'arrow.triangle.merge', material: 'merge' },
  permission: {
    sf: 'exclamationmark.shield',
    sfFilled: 'exclamationmark.shield.fill',
    material: 'gpp_maybe',
  },
  question: { sf: 'questionmark.circle', material: 'help' },
  refused: { sf: 'nosign', material: 'block' },
  scheduled: { sf: 'timer', material: 'timer' },
  waiting: { sf: 'hourglass', material: 'hourglass' },
  warning: { sf: 'exclamationmark.triangle', material: 'warning' },
} as const satisfies Record<string, NativeSymbol>;
