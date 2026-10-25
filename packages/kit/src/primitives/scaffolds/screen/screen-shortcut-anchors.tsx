import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ShortcutAnchor } from '#primitives/actions/action';
import type { ScreenHeader } from './use-screen-header';

// The Actions' shortcuts run while their node is shown, so each keeps an empty one, out of the Screen's layout, ahead of the content's.
export function ShortcutAnchors({
  header,
}: {
  header: ScreenHeader;
}): ReactElement {
  return (
    <View className="absolute">
      {header.anchors.map((id) => (
        <ShortcutAnchor key={id} id={id} />
      ))}
    </View>
  );
}
