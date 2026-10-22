import type { UniversalHostProps } from '@expo/ui';

export type HostProps = Omit<
  UniversalHostProps,
  'colorScheme' | 'seedColor'
> & {
  // iOS only: lets the content draw into the safe area instead of being pushed out of it.
  ignoreSafeArea?: 'all';
  // The token Expo themes the subtree from: the accent, or primary for the Button's filled look. Defaults to accent.
  seed?: 'accent' | 'primary';
};
