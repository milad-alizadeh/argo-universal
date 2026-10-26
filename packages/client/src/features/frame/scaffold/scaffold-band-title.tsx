import type { ReactElement } from 'react';
import { View } from 'react-native';
import { BandTitleLeading } from './band-title-leading';
import type { PartReads } from './use-scaffold-layout';

type BandTitleReads = PartReads<'band', 'bandTitleLeading' | 'motion'>;

// A bounded flex item gives the single-line title all the room up to the trailing group.
export function BandTitle({ scaffold, layout }: BandTitleReads): ReactElement {
  return (
    <View className="min-w-0 flex-1 flex-row items-center overflow-hidden">
      <BandTitleLeading width={layout.bandTitleLeading} {...layout.motion} />
      <View
        testID="band-title"
        className="min-w-0 flex-1 overflow-hidden web:[app-region:no-drag]"
      >
        {scaffold.band?.title}
      </View>
    </View>
  );
}
