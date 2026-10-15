import type * as React from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import type { Section } from '../../../lib/product/navigation/sections';
import { PhoneMenuButton } from '../components/phone-menu-button';
import { shellSections } from '../components/shell-sections';
import { PlaceholderList } from './section-list';

export interface PlaceholderPhoneScreenProps {
  section: Section;
}

// A narrow web window's section root whose list is not built yet: its header row with ☰ and the title, over a placeholder.
export function PlaceholderPhoneScreen({
  section,
}: PlaceholderPhoneScreenProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <ScreenHeader
        title={shellSections[section].title}
        left={<PhoneMenuButton />}
      />
      <PlaceholderList section={section} />
    </View>
  );
}
