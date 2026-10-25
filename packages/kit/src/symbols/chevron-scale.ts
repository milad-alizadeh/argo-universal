import type { SFSymbol } from 'expo-symbols';

// iOS draws a chevron at half the icon beside it: SF's fills most of its box where Material's fills about half.
export const iosChevronScale = 0.5;

// SF's chevrons read large beside its other symbols, so the desktop draws one at three quarters of its set size.
export const desktopChevronScale = 0.75;

export const chevronSymbols = new Set<SFSymbol>([
  'chevron.up',
  'chevron.down',
  'chevron.left',
  'chevron.right',
  'chevron.forward',
  'chevron.up.chevron.down',
]);
