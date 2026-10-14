import type * as React from 'react';
import { memo, useState } from 'react';
import { Platform } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Pressable } from '#primitives/pressable';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ProjectActions } from './project-heading-actions';
import { ProjectToggle } from './project-heading-toggle';

export interface ProjectHeadingProps {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onProjectSettings?: () => void;
}

export interface InteractionEvents {
  onHoverIn: () => void;
  onHoverOut: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

interface HeadingInteraction {
  highlighted: boolean;
  events: InteractionEvents;
}

// Whether the pointer is over the heading or focus is inside it, and the events that track both.
function useHeadingInteraction(): HeadingInteraction {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return {
    highlighted: hovered || focused,
    events: {
      onHoverIn: (): void => setHovered(true),
      onHoverOut: (): void => setHovered(false),
      onFocus: (): void => setFocused(true),
      onBlur: (): void => setFocused(false),
    },
  };
}

// A phone always shows ⋯ and +; a wide window shows them on hover or focus.
function actionsVisible(wide: boolean, highlighted: boolean): boolean {
  return Platform.OS !== 'web' || !wide || highlighted;
}

function rowClassName(highlighted: boolean): string {
  return cn(
    'min-h-10 web:h-10 wide:min-h-8 web:wide:h-8 flex-row items-center rounded-md pr-1',
    highlighted && 'bg-hover',
  );
}

interface HeadingRowProps extends HeadingInteraction {
  children: React.ReactNode;
}

function HeadingRow(props: HeadingRowProps): React.JSX.Element {
  return (
    <Pressable
      accessible={false}
      onHoverIn={props.events.onHoverIn}
      onHoverOut={props.events.onHoverOut}
      className={rowClassName(props.highlighted)}
    >
      {props.children}
    </Pressable>
  );
}

function useHeadingState(): HeadingInteraction & {
  wide: boolean;
  visible: boolean;
} {
  const wide = useWide();
  const interaction = useHeadingInteraction();
  const visible = actionsVisible(wide, interaction.highlighted);

  return { ...interaction, wide, visible };
}

export const ProjectHeading = memo(function ProjectHeading(
  props: ProjectHeadingProps,
): React.JSX.Element {
  const { wide, visible, ...interaction } = useHeadingState();

  return (
    <HeadingRow {...interaction}>
      <ProjectToggle {...props} wide={wide} events={interaction.events} />
      <ProjectActions
        {...props}
        visible={visible}
        events={interaction.events}
      />
    </HeadingRow>
  );
});
