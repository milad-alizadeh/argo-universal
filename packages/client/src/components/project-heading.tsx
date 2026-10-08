import {
  DotsThreeIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
} from 'phosphor-react-native';
import type * as React from 'react';
import { memo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from './icon';

export interface ProjectHeadingProps {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onProjectSettings?: () => void;
}

export const ProjectHeading = memo(function ProjectHeading({
  name,
  collapsed,
  onToggle,
  onAdd,
  addLabel = `Add to ${name}`,
  onProjectSettings,
}: ProjectHeadingProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const actionsVisible = Platform.OS !== 'web' || hovered || focused;
  const interactionEvents = {
    onHoverIn: (): void => setHovered(true),
    onHoverOut: (): void => setHovered(false),
    onFocus: (): void => setFocused(true),
    onBlur: (): void => setFocused(false),
  };
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={cn(
        'h-10 wide:h-8 flex-row items-center rounded-md pr-1',
        (hovered || focused) && 'bg-sidebar-accent',
      )}
    >
      <Button
        variant="ghost"
        accessibilityLabel={name}
        accessibilityState={{ expanded: !collapsed }}
        aria-expanded={!collapsed}
        className="h-full sm:h-full min-w-0 flex-1 justify-start gap-2 pl-2.5 pr-2 py-1 hover:bg-transparent dark:hover:bg-transparent web:has-[>svg]:pl-2.5 web:has-[>svg]:pr-2"
        onPress={onToggle}
        {...interactionEvents}
      >
        <TextClassContext.Provider value={undefined}>
          <Icon
            as={collapsed ? FolderIcon : FolderOpenIcon}
            className="text-muted-foreground wide:text-foreground"
          />
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none min-w-0 flex-1 text-base leading-6 font-semibold wide:text-sm wide:leading-5 wide:font-medium"
          >
            {name}
          </Text>
        </TextClassContext.Provider>
      </Button>
      <View
        className={cn(
          'flex-row items-center gap-0.5',
          !actionsVisible && 'opacity-0',
        )}
      >
        <Button
          variant="ghost"
          accessibilityLabel={`Project settings for ${name}`}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>svg]:px-0"
          onPress={onProjectSettings}
          disabled={!onProjectSettings}
          {...interactionEvents}
        >
          <Icon as={DotsThreeIcon} className="text-foreground" />
        </Button>
        <Button
          variant="ghost"
          accessibilityLabel={addLabel}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>svg]:px-0"
          onPress={onAdd}
          disabled={!onAdd}
          {...interactionEvents}
        >
          <Icon as={PlusIcon} className="text-foreground" />
        </Button>
      </View>
    </Pressable>
  );
});
