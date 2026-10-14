import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import type { Section } from '../../../../lib/product/navigation/sections';
import { PhoneMenuButton } from '../phone-menu-button';
import { shellSections } from '../shell-sections';

export interface PhoneSectionViewProps {
  section: Section;
  // The list's trailing items and search in the native header.
  header?: Pick<ScreenHeaderProps, 'right' | 'search'>;
  list: ReactNode;
}

function PhoneSectionHeader({
  section,
  header,
}: Omit<PhoneSectionViewProps, 'list'>): React.JSX.Element {
  return (
    <ScreenHeader
      title={shellSections[section].title}
      left={<PhoneMenuButton />}
      {...header}
    />
  );
}

// A phone section root: ☰, the section's title and its list's items in the native header, over the list.
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
