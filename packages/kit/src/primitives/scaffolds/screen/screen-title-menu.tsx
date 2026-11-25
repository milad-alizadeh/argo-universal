import type { ComponentProps, ReactElement } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { ActionMenu, type ActionGroup } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';

// The text role a title draws in: a page's Title, or the Heading a window's title bar draws.
export type TitleRole = 'title' | 'heading';

interface TitleMenuProps {
  title: string;
  // The heading level the title keeps: 1 for a page, 2 for a list column's.
  level: number;
  groups: ActionGroup[];
  inlineToolbar?: boolean;
  role?: TitleRole;
}

/*
 * A title that opens a menu, such as a picker of what the page shows: the heading holds a WAI-ARIA menu button, the
 * title and a down chevron. On the web the title is still the page's heading and is announced as a button with its
 * menu; on iOS and Android the system menu's button is the one accessible element, so it is read as a button. The
 * menu is the header's own (`ActionMenu`): Radix on the web, a SwiftUI Menu on iOS and a Compose DropdownMenu on
 * Android. It opens below the title, from its start, as a scope picker under a leading title does.
 */
export function TitleMenu(props: TitleMenuProps): ReactElement {
  return (
    <View {...headingOf(props.level)}>
      <ActionMenu
        groups={props.groups}
        label={props.title}
        trigger={titleTriggerOf(props)}
        align="start"
        toolbarTitle={props.inlineToolbar}
      />
    </View>
  );
}

const titleTriggerOf = ({
  title,
  inlineToolbar,
  role,
}: TitleMenuProps): ReactElement => (
  <TitleTrigger
    title={title}
    inlineToolbar={inlineToolbar}
    role={role}
    focusable={inlineToolbar && Platform.OS === 'android' ? false : undefined}
  />
);

const headingOf = (level: number) =>
  ({
    accessibilityRole: 'heading',
    'aria-level': level,
    // A column, so the menu's trigger is held to the heading's width and a long title ends in an ellipsis.
    className: 'min-w-0',
  }) as const;

// The menu passes its press handlers and ref through these props.
type TitleTriggerProps = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'role'
> &
  Pick<TitleMenuProps, 'title' | 'inlineToolbar' | 'role'>;

const triggerClassName = cn(
  'min-w-0 max-w-full flex-row items-center gap-1 self-start rounded-control -mx-1 px-1 web:hover:bg-hover',
  tintTransitionClassName,
);

function TitleTrigger(options: TitleTriggerProps): ReactElement {
  const { title, inlineToolbar, role, ...props } = options;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
      className={triggerClassName}
    >
      <TitleLabel title={title} inlineToolbar={inlineToolbar} role={role} />
      <Chevron direction="down" />
    </Pressable>
  );
}

// The inline iOS toolbar has a fixed height even at accessibility text sizes.
const toolbarTitleMaxScale = 1.5;

type TitleLabelProps = Pick<TitleMenuProps, 'title' | 'inlineToolbar' | 'role'>;

function TitleLabel({
  title,
  inlineToolbar,
  role,
}: TitleLabelProps): ReactElement {
  return (
    <Text
      {...titleAppearance(inlineToolbar, role)}
      className="shrink"
      numberOfLines={1}
      selectable={false}
    >
      {title}
    </Text>
  );
}

type TitleAppearance = Pick<
  ComponentProps<typeof Text>,
  'role' | 'maxFontSizeMultiplier'
>;

const titleAppearance = (
  inlineToolbar: boolean | undefined,
  role: TitleRole = 'title',
): TitleAppearance =>
  inlineToolbar && Platform.OS === 'ios'
    ? { role: 'nav-title', maxFontSizeMultiplier: toolbarTitleMaxScale }
    : { role };

const titleProps = {
  role: 'title',
  accessibilityRole: 'heading',
  numberOfLines: 1,
} as const;

type ScreenTitleProps = Omit<TitleMenuProps, 'title'> & { title?: string };

// A title with a menu is a menu button inside the heading; one without is the heading's text.
export function ScreenTitle(props: ScreenTitleProps): ReactElement | null {
  const { title, level, groups, role } = props;

  if (!title) return null;

  if (groups.length)
    return (
      <TitleMenu title={title} level={level} groups={groups} role={role} />
    );

  return (
    <Text {...titleProps} role={role ?? titleProps.role} aria-level={level}>
      {title}
    </Text>
  );
}
