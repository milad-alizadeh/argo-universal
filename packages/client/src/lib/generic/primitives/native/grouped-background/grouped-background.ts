import type { ColorValue } from 'react-native';

// Only iOS draws a grey under its grouped cards; elsewhere the surface keeps its own fill.
export const groupedBackground: ColorValue | undefined = undefined;
