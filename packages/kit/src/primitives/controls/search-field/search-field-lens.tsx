import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '#primitives/content/icon';
import { type SearchFieldGeometry, useLensStyle } from './search-field-motion';
import type { MorphState } from './search-field-parts';

// The lens sits over the search button, wherever it is in the row.
const lensBox = ({
  triggerWidth,
  triggerInset,
}: SearchFieldGeometry): ViewStyle => ({
  width: triggerWidth,
  right: triggerInset,
});

const muted = 'text-muted-foreground';

const lensSize = (sidebar?: boolean): 'sm' | 'md' => (sidebar ? 'sm' : 'md');

// Drawn above the surface, so the button's lens becomes the field's; a sidebar's is the 16 control glyph.
export function Lens(props: MorphState): React.JSX.Element {
  const style = useLensStyle(props.progress, props.geometry);

  return (
    <Animated.View
      testID="search-lens"
      pointerEvents="none"
      className="absolute inset-y-0 right-0 items-center justify-center"
      style={[lensBox(props.geometry), style]}
    >
      <Icon name="search" size={lensSize(props.sidebar)} className={muted} />
    </Animated.View>
  );
}
