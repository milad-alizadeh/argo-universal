import { useWindowDimensions } from 'react-native';

export function useWide(): boolean {
  return useWindowDimensions().width >= 720;
}
