import type { ComponentProps, ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { ActionMenu, type ActionGroup } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';

interface TitleMenuProps {
  title: string;
  // The heading level the title keeps: 1 for a page, 2 for a list column's.
  level: number;
  groups: ActionGroup[];
}

/*
 * A title that opens a menu, such as a picker of what the page shows: the heading holds a WAI-ARIA menu button, the
 * title and a down chevron, so the title is still the page's heading and is announced as a button with its menu. The
 * menu is the header's own (`ActionMenu`): Radix on the web, a SwiftUI Menu on iOS and a Compose DropdownMenu on
 * Android.
 */
export function TitleMenu(props: TitleMenuProps): ReactElement {
  return (
    <View
      accessibilityRole="heading"
      aria-level={props.level}
      className="min-w-0 flex-row"
    >
      <ActionMenu
        groups={props.groups}
        label={props.title}
        trigger={<TitleTrigger title={props.title} />}
      />
    </View>
  );
}

// The menu passes its press handlers and ref through these props.
type TitleTriggerProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'role'
> & { title: string };

const triggerClassName = cn(
  'min-w-0 flex-row items-center gap-1 self-start rounded-control -mx-1 px-1 web:outline-none web:hover:bg-hover web:focus-visible:bg-hover',
  tintTransitionClassName,
);

function TitleTrigger({ title, ...props }: TitleTriggerProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
      className={triggerClassName}
    >
      <Text role="title" numberOfLines={1} selectable={false}>
        {title}
      </Text>
      <Chevron direction="down" />
    </Pressable>
  );
}

const titleProps = {
  role: 'title',
  accessibilityRole: 'heading',
  numberOfLines: 1,
} as const;

type ScreenTitleProps = Omit<TitleMenuProps, 'title'> & { title?: string };

// A title with a menu is a menu button inside the heading; one without is the heading's text.
export function ScreenTitle(props: ScreenTitleProps): ReactElement | null {
  const { title, level, groups } = props;

  if (!title) return null;

  if (groups.length)
    return <TitleMenu title={title} level={level} groups={groups} />;

  return (
    <Text {...titleProps} aria-level={level}>
      {title}
    </Text>
  );
}
