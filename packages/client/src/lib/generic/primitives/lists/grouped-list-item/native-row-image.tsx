import { RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconSlot } from '#primitives/display/icon';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { hiddenFromAccessibility } from './status-dot';

interface Props {
  image: ReactElement;
  variant?: ResolvedItemProps['variant'];
  layout?: ResolvedItemProps['leadingLayout'];
}

// Content Slots keep their intrinsic size and accessibility; decorative images use the icon tile.
export function NativeRowImage(props: Props): ReactElement {
  return (
    <RNHostView matchContents>
      <ImageContent {...props} />
    </RNHostView>
  );
}

function ImageContent({ image, variant, layout }: Props): ReactElement {
  if (layout === 'content') return <View>{image}</View>;

  return (
    <IconSlot
      role={variant === 'card' ? 'identity' : 'row'}
      {...hiddenFromAccessibility}
    >
      {image}
    </IconSlot>
  );
}
