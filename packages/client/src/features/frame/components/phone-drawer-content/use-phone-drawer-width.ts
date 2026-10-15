import { useWindowDimensions } from 'react-native';

// The open drawer's width, and how much of the screen stays visible beside it.
const drawerWidth = 300;

const visibleScreenWidth = 64;

// The drawer's width, narrowed so a strip of the page still shows beside it.
export function usePhoneDrawerWidth(): number {
  const { width } = useWindowDimensions();

  return Math.min(drawerWidth, Math.max(0, width - visibleScreenWidth));
}
