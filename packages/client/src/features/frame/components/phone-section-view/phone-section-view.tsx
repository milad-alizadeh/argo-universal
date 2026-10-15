import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { PhoneSectionHeader } from './phone-section-header';
import type { PhoneSectionHeaderProps } from './phone-section-header-props';

export interface PhoneSectionViewProps extends PhoneSectionHeaderProps {
  list: ReactNode;
}

// A phone section root: ☰, the section's title and its list's items in the header, over the list.
export function PhoneSectionView({
  list,
  ...header
}: PhoneSectionViewProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <PhoneSectionHeader {...header} />
      {list}
    </View>
  );
}
