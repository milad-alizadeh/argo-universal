import { ListIcon } from 'phosphor-react-native/src/icons/List';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface PhoneListHeaderProps {
  title: string;
  attentionCount?: number;
  onMenu: () => void;
  onSearch: () => void;
  onFilter: () => void;
}

export function PhoneListHeader({
  title,
  attentionCount = 0,
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
        accessibilityHint={
          attentionCount > 0
            ? `${attentionCount} Sessions need attention`
            : undefined
        }
        onPress={onMenu}
      >
        <Icon as={ListIcon} className="size-6" />
        {attentionCount > 0 && (
          <View className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warning" />
        )}
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
