import { Platform } from 'react-native';
import { useInCompactScope } from './compact-scope';

/*
 * A tablet's pane on iOS is an inner view, so UIKit keeps its stock search bar to an inner edge's narrow leading
 * margin; the page's controls and the Form's sections start on the same edge (#927).
 */
export const paneLeadingInset = 'pl-2';

const ios = Platform.OS === 'ios';

// Inside an iPad's pane, where a page draws as on a phone under the stock header.
export function useInIosPane(): boolean {
  return useInCompactScope() && ios;
}
