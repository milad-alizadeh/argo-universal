import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text, TextClassContext } from '#primitives/display/text';
import { Pressable, contentActionClass } from '#primitives/pressable';
import type { InteractionEvents } from './project-heading';

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
  wide: boolean;
}

const nameText = {
  selectable: false,
  numberOfLines: 1,
  className: 'select-none min-w-0 flex-1',
} as const;

function ProjectName(props: ProjectNameProps): React.JSX.Element {
  return (
    <TextClassContext.Provider value={undefined}>
      <FolderIcon collapsed={props.collapsed} />
      <Text {...nameText} role={props.wide ? 'body' : 'heading'}>
        {props.name}
      </Text>
    </TextClassContext.Provider>
  );
}

const toggleClassName = contentActionClass({
  variant: 'ghost',
  className:
    'web:h-full web:sm:h-full min-w-0 flex-1 justify-start gap-1.5 pl-2.5 pr-2 py-1 wide:gap-3 wide:pl-4 hover:bg-transparent dark:hover:bg-transparent',
});

interface ProjectToggleProps extends ProjectNameProps {
  onToggle: () => void;
  events: InteractionEvents;
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
      {...props.events}
      role="button"
      className={toggleClassName}
    >
      <ProjectName {...props} />
    </Pressable>
  );
}
