import { View } from 'react-native';
import { PhoneMenuButton } from '../components/PhoneMenuButton';
import { useSectionList } from '../components/SectionList';
import { type ShellSection, shellSections } from '../components/shell-sections';
import { ScreenHeader } from '../navigation/screen-header';

export interface PhoneSectionScreenProps {
  section: ShellSection;
}

// A phone section root: ☰, the section's title and its list's items in the native header, over the list.
export function PhoneSectionScreen({ section }: PhoneSectionScreenProps) {
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
