import type * as React from 'react';
import { memo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import {
  Text,
  TextClassContext,
} from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { IconButton } from '../../../../lib/generic/primitives/buttons/icon-button/icon-button';
import { contentActionClass } from '../../../../lib/generic/primitives/pressable/pressable';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

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
  const wide = useWide();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // A phone always shows ⋯ and +; a wide window shows them on hover or focus.
  const actionsVisible = Platform.OS !== 'web' || !wide || hovered || focused;
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
            'h-full sm:h-full min-w-0 flex-1 justify-start gap-1.5 pl-2.5 pr-2 py-1 wide:gap-3 wide:pl-4 hover:bg-transparent dark:hover:bg-transparent',
        })}
      >
        <TextClassContext.Provider value={undefined}>
          {/* Wide, the folder sits in the same 20 slot as a Session's logo. */}
          <View className="items-center wide:w-5">
            <Icon
              name={collapsed ? 'folder' : 'folder-open'}
              className="text-muted-foreground wide:text-foreground"
            />
          </View>
          <Text
            selectable={false}
            numberOfLines={1}
            role={wide ? 'body' : 'heading'}

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
