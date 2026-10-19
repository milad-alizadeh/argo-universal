import type * as React from 'react';
import { View } from 'react-native';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';
import { Text, TextClassContext } from '#primitives/content/text';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';

function FolderIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return (
    // Wide, the folder sits in the same 20 slot as a Session's logo.
    <View className="items-center wide:w-5">
      <Icon
        role="control"
        name={collapsed ? 'folder' : 'folder-open'}
        className="text-muted-foreground wide:text-foreground"
      />
    </View>
  );
}

interface ProjectNameProps {
  name: string;
  collapsed: boolean;
}

// A phone's Project heads its Sessions; a wide sidebar names it as body text.
const nameText = {
  selectable: false,
  numberOfLines: 1,
  className: 'select-none min-w-0 flex-1',
  role: { compact: 'heading', wide: 'body' },
} as const;

function ProjectName(props: ProjectNameProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value={undefined}>
      <FolderIcon collapsed={props.collapsed} />
      <Text {...nameText}>{props.name}</Text>
    </TextClassContext.Provider>
  );
}

const toggleClassName = contentActionClass({
  variant: 'ghost',
  className:
    'web:h-full web:sm:h-full min-w-0 flex-1 justify-start gap-1.5 pl-2.5 pr-2 py-1 wide:gap-3 wide:pl-4 hover:bg-transparent dark:hover:bg-transparent',
});

interface ProjectToggleProps extends ProjectNameProps, ContextMenuTriggerProps {
  onToggle: () => void;
}

interface ToggleAccessibility {
  accessibilityLabel: string;
  accessibilityState: { expanded: boolean };
  'aria-expanded': boolean;
}

function toggleAccessibility({
  name,
  collapsed,
}: ProjectNameProps): ToggleAccessibility {
  return {
    accessibilityLabel: name,
    accessibilityState: { expanded: !collapsed },
    'aria-expanded': !collapsed,
  };
}

export function ProjectToggle(props: ProjectToggleProps): React.JSX.Element {
  return (
    <Pressable
      {...toggleAccessibility(props)}
      onPress={props.onToggle}
      onLongPress={props.onLongPress}
      role="button"
      className={toggleClassName}
    >
      <ProjectName {...props} />
    </Pressable>
  );
}
