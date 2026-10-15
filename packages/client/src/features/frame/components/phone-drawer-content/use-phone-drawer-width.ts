import { useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';

// The drawer's width: its token, narrowed so a strip of the page still shows beside it.
export function usePhoneDrawerWidth(): number {
  const { width } = useWindowDimensions();

  const drawerWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer')),
  );

  const visibleScreenWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-phone-drawer-peek')),
  );

  return Math.min(drawerWidth, Math.max(0, width - visibleScreenWidth));
}
