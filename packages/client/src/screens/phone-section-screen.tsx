import type * as React from 'react';
import { View } from 'react-native';
import { PhoneMenuButton } from '../components/phone-menu-button';
import { shellSections } from '../components/shell-sections';
import { ScreenHeader } from '../navigation/screen-header';
import type { Section } from '../navigation/sections';
import { useSectionList } from './section-list';

export interface PhoneSectionScreenProps {
  section: Section;
}

// A phone section root: ☰, the section's title and its list's items in the native header, over the list.
export function PhoneSectionScreen({
  section,
}: PhoneSectionScreenProps): React.JSX.Element {
  const { phoneHeader, list } = useSectionList(section);
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={shellSections[section].title}
        left={<PhoneMenuButton />}
        {...phoneHeader}
      />
      {list}
    </View>
  );
}
