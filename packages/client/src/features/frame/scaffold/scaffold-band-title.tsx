import type { ReactElement } from 'react';
import { View } from 'react-native';
import { BandTitleLeading } from './band-title-leading';
import type { ScaffoldPartProps } from './use-scaffold-layout';

// A bounded flex item gives the single-line title all the room up to the trailing group.
export function BandTitle(parts: ScaffoldPartProps): ReactElement {
  const { layout } = parts;

  return (
    <View className="min-w-0 flex-1 flex-row items-center overflow-hidden">
      <BandTitleLeading width={layout.bandTitleLeading} {...layout.motion} />
      <View
        testID="band-title"
        className="min-w-0 flex-1 overflow-hidden web:[app-region:no-drag]"
      >
        {parts.scaffold.band?.title}
      </View>
    </View>
  );
}
