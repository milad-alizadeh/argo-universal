import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ShortcutAnchor } from '#primitives/actions/action';

// The Actions' shortcuts run while their node is shown, so each keeps an empty one, out of the Screen's layout, ahead of the content's.
export function ShortcutAnchors({
  anchors,
}: {
  anchors: string[];
}): ReactElement {
  return (
    <View className="absolute">
      {anchors.map((id) => (
        <ShortcutAnchor key={id} id={id} />
      ))}
    </View>
  );
}
