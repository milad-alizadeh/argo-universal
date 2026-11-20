import { useViewability, type ViewToken } from '@legendapp/list/react-native';
import {
  createContext,
  Fragment,
  type PropsWithChildren,
  type ReactElement,
  useCallback,
  useState,
} from 'react';
import { Platform } from 'react-native';

export const feedRowViewability = {
  id: 'feed-row',
  itemVisiblePercentThreshold: 0,
};

export const FeedRowVisible = createContext(true);

// Legend stores one visibility listener per recycled cell. Share it across the row's animations.
function ObservedRow({ children }: PropsWithChildren): ReactElement {
  const [visible, setVisible] = useState(false);

  const report = useCallback(
    (token: ViewToken<unknown>) => setVisible(token.isViewable),
    [],
  );

  useViewability(report, feedRowViewability.id);

  return <FeedRowVisible value={visible}>{children}</FeedRowVisible>;
}

export const FeedRowVisibility = Platform.OS === 'ios' ? ObservedRow : Fragment;
