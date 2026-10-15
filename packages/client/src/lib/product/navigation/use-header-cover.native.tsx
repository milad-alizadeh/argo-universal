import { useHeaderHeight } from 'expo-router/react-navigation';
import { hasLiquidGlass } from '#lib/generic/native-header';

// How far down the screen its header lies over the content: iOS 26's transparent header covers the top; every other header takes its own space.
export function useHeaderCover(): number {
  const height = useHeaderHeight();

  return hasLiquidGlass ? height : 0;
}
