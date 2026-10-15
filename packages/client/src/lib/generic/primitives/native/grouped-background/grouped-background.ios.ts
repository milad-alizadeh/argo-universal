import { type ColorValue, PlatformColor } from 'react-native';

// The stock grey under iOS's inset grouped cards, which a sheet of grouped choices takes as its own.
export const groupedBackground: ColorValue | undefined = PlatformColor(
  'systemGroupedBackground',
);
