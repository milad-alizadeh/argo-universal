import { ListIcon } from 'phosphor-react-native/src/icons/List';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface PhoneListHeaderProps {
  title: string;
  onMenu: () => void;
  onSearch: () => void;
  onFilter: () => void;
}

export function PhoneListHeader({
  title,
  onMenu,
  onSearch,
  onFilter,
}: PhoneListHeaderProps) {
  return (
    <View className="h-16 flex-row items-center gap-2 px-3">
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="Open navigation"
        onPress={onMenu}
      >
        <Icon as={ListIcon} className="size-6" />
      </Button>
      <Text role="heading" aria-level={1} className="flex-1 text-xl font-bold">
        {title}
      </Text>
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={`Search ${title}`}
        onPress={onSearch}
      >
        <Icon as={MagnifyingGlassIcon} className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={`Filter ${title}`}
        onPress={onFilter}
      >
        <Icon as={SlidersHorizontalIcon} className="size-6" />
      </Button>
    </View>
  );
}
