import type * as React from 'react';
import { View } from 'react-native';
import type { Section } from '../../../lib/product/navigation/sections';
import { PlaceholderPhoneHeader } from '../components/placeholder-phone-header';
import { shellSections } from '../components/shell-sections';
import { PlaceholderList } from './section-list';

export interface PlaceholderPhoneScreenProps {
  section: Section;
}

// A section whose list is not built yet, below its platform's phone header.
export function PlaceholderPhoneScreen({
  section,
}: PlaceholderPhoneScreenProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <PlaceholderPhoneHeader title={shellSections[section].title} />
      <PlaceholderList section={section} />
    </View>
  );
}
