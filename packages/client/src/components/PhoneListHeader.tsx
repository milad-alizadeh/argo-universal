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
    <View className="h-11 flex-row items-center px-2">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 sm:size-11"
        accessibilityLabel="Open navigation"
        accessibilityHint={
          attentionCount > 0
            ? `${attentionCount} Sessions need attention`
            : undefined
        }
        onPress={onMenu}
      >
        <Icon as={ListIcon} className="size-phone-shell-icon" />
        {attentionCount > 0 && (
          <View className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warning" />
        )}
      </Button>
      <Text
        role="heading"
        aria-level={1}
        className="min-w-0 flex-1 pl-1 text-xl font-semibold"
        numberOfLines={1}
      >
        {title}
      </Text>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 sm:size-11"
        accessibilityLabel={`Search ${title}`}
        onPress={onSearch}
      >
        <Icon as={MagnifyingGlassIcon} className="size-phone-shell-icon" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 sm:size-11"
        accessibilityLabel={`Filter ${title}`}
        onPress={onFilter}
      >
        <Icon as={SlidersHorizontalIcon} className="size-phone-shell-icon" />
      </Button>
    </View>
  );
}
