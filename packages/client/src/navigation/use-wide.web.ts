import { useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';

export function useWide(): boolean {
  const { width } = useWindowDimensions();
  const breakpoint = Number.parseFloat(
    String(useCSSVariable('--breakpoint-wide')),
  );
  return width >= breakpoint;
}
