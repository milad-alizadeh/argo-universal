import { Children, type ReactElement } from 'react';
import { Animated, type ScrollViewProps } from 'react-native';

// Legend renders the footer last. Pin its top as rows above it grow or shrink.
export const feedScrollRenderer =
  (following: boolean) =>
  (props: ScrollViewProps): ReactElement => {
    const anchor = following
      ? {
          minIndexForVisible: Math.max(
            0,
            Children.toArray(props.children).length - 1,
          ),
        }
      : props.maintainVisibleContentPosition;

    return (
      <Animated.ScrollView {...props} maintainVisibleContentPosition={anchor} />
    );
  };
