import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOpenDrawer } from '../components/PhoneLayout';
import { PhoneListHeader } from '../components/PhoneListHeader';
import { useSectionList } from '../components/SectionList';
import { type ShellSection, shellSections } from '../components/shell-sections';

export interface PhoneSectionScreenProps {
  section: ShellSection;
}

// A phone section root: ☰ and the list's header row over the section's list, inside PhoneLayout's drawer.
export function PhoneSectionScreen({ section }: PhoneSectionScreenProps) {
  const openDrawer = useOpenDrawer();
  const { top } = useSafeAreaInsets();
  const { header, list } = useSectionList(section);
  return (
    <View className="flex-1 bg-card">
      <View style={{ height: top }} />
      <PhoneListHeader
        title={shellSections[section].title}
        onMenu={openDrawer}
        // Search and filter arrive with the Sessions list screen.
        onSearch={() => {}}
        onFilter={() => {}}
      >
        {header}
      </PhoneListHeader>
      {list}
    </View>
  );
}
