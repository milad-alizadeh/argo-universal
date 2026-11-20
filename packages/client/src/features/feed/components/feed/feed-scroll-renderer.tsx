import { Children, type ReactElement } from 'react';
import { Animated, Platform, type ScrollViewProps } from 'react-native';

const footerIndex = (props: ScrollViewProps): number =>
  Math.max(0, Children.toArray(props.children).length - 1);

type ScrollRenderer = (props: ScrollViewProps) => ReactElement<ScrollViewProps>;

// Legend renders the footer last. Pin its top as rows above it grow or shrink.
export function feedScrollRenderer(
  following: boolean,
): ScrollRenderer | undefined {
  if (Platform.OS === 'web') return;

  return (props: ScrollViewProps): ReactElement<ScrollViewProps> => {
    const anchor = following
      ? { minIndexForVisible: footerIndex(props) }
      : props.maintainVisibleContentPosition;

    return (
      <Animated.ScrollView {...props} maintainVisibleContentPosition={anchor} />
    );
  };
}
