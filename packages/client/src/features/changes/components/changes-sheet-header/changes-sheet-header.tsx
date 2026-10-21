import { SegmentedControl } from '@repo/kit/primitives/inputs/segmented-control';
import type { ReactElement } from 'react';
import { View } from 'react-native';

const segments = [
  { value: 'change', label: 'Change', disabled: true },
  { value: 'files', label: 'Files' },
];

const stayOnFiles = (): void => {};

// Paper / Changes sheet. Change stays unavailable until the Session supplies its Change panel.
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
