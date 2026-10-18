// Outcomes and states a row or mark reports.
export const statusSymbols = {
  cancelled: { sf: 'stop', sfFilled: 'stop.fill', material: 'stop' },
  error: { sf: 'exclamationmark.circle', material: 'error' },
  failed: {
    sf: 'xmark.circle',
    sfFilled: 'xmark.circle.fill',
    material: 'cancel',
  },
  info: { sf: 'info.circle', material: 'info' },
  passed: { sf: 'checkmark.circle', material: 'check_circle' },
  pending: { sf: 'circle', material: 'radio_button_unchecked' },
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
} as const;
