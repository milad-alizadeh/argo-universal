// Outcomes and states a row or mark reports.
export const statusSymbols = {
  cancelled: { sf: 'stop', sfFilled: 'stop.fill', material: 'stop' },
  // A plain filled dot, coloured by the tone beside a state's words rather than replacing them.
  dot: { sf: 'circle.fill', material: 'circle' },
  error: { sf: 'exclamationmark.circle', material: 'error' },
  failed: {
    sf: 'xmark.circle',
    sfFilled: 'xmark.circle.fill',
    material: 'cancel',
  },
  info: { sf: 'info.circle', material: 'info' },
  passed: {
    sf: 'checkmark.circle',
    sfFilled: 'checkmark.circle.fill',
    material: 'check_circle',
  },
  // Local Network off for the App, and a computer that cannot be found.
  'network-off': { sf: 'network.slash', material: 'wifi_off' },
  'computer-off': {
    sf: 'laptopcomputer.slash',
    material: 'desktop_access_disabled',
  },
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
