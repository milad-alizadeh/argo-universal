import { hasLiquidGlass } from '@repo/client';
import { useHeaderHeight } from 'expo-router/react-navigation';

export function useSheetContentInset(): number {
  const height = useHeaderHeight();
  return hasLiquidGlass ? height : 0;
}
