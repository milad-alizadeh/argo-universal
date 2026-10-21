import type { ReactElement } from 'react';
import { View } from 'react-native';
import { SegmentedControl } from '#primitives/inputs/segmented-control';

const segments = [
  { value: 'pr', label: 'PR', disabled: true },
  { value: 'files', label: 'File changes' },
];

const stayOnFiles = (): void => {};

// Paper / Changes sheet. PR stays unavailable until the Session supplies its PR panel.
export function ChangesSheetHeader(): ReactElement {
  return (
    <View className="px-4 pb-2">
      <SegmentedControl
        label="Git"
        options={segments}
        value="files"
        onValueChange={stayOnFiles}
      />
    </View>
  );
}
