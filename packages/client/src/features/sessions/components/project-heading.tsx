import type * as React from 'react';
import { memo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Text, TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { IconButton } from '../../../lib/generic/primitives/icon-button';
import { contentActionClass } from '../../../lib/generic/primitives/pressable';
import { Icon } from '../../../lib/generic/symbols/icon';

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
      <Pressable
        accessibilityLabel={name}
        accessibilityState={{ expanded: !collapsed }}
        aria-expanded={!collapsed}
        onPress={onToggle}
        {...interactionEvents}
        role="button"
        className={contentActionClass({
          variant: 'ghost',
          className:
            'h-full sm:h-full min-w-0 flex-1 justify-start gap-2 pl-2.5 pr-2 py-1 hover:bg-transparent dark:hover:bg-transparent web:has-[>[data-icon]]:pl-2.5 web:has-[>[data-icon]]:pr-2',
        })}
      >
        <TextClassContext.Provider value={undefined}>
          <Icon
            name={collapsed ? 'folder' : 'folder-open'}
            className="text-muted-foreground wide:text-foreground"
          />
          <Text
            selectable={false}
            numberOfLines={1}
            role={'heading'}

            className="select-none min-w-0 flex-1"
          >
            {name}
          </Text>
        </TextClassContext.Provider>
      </Pressable>
      <View
        className={cn(
          'flex-row items-center gap-0.5',
          !actionsVisible && 'opacity-0',
        )}
      >
        <IconButton
          variant="ghost"
          accessibilityLabel={`Project settings for ${name}`}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>[data-icon]]:px-0"
          onPress={onProjectSettings}
          disabled={!onProjectSettings}
          {...interactionEvents}
          icon={'more'}
          iconClassName={'text-foreground'}
          size="md"
        />
        <IconButton
          variant="ghost"
          accessibilityLabel={addLabel}
          className="size-6 sm:size-6 rounded-sm p-0 web:has-[>[data-icon]]:px-0"
          onPress={onAdd}
          disabled={!onAdd}
          {...interactionEvents}
          icon={'add'}
          iconClassName={'text-foreground'}
          size="md"
        />
      </View>
    </Pressable>
  );
});
