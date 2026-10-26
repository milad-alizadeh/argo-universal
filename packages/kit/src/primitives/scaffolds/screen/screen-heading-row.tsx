import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useHeadingInset } from '#kit/heading-inset';
import { useWide } from '#kit/use-wide/use-wide';
import {
  HeaderActions,
  headerSlots,
  type HeaderActionsProps,
} from '#primitives/actions/action';
import type { IconButtonSize } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { ScreenBack } from './screen-back';
import { ScreenColumn } from './screen-column';
import { SearchHeading } from './screen-heading-search';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';
import { SelectEntry } from './screen-selection-mode';

// A wide Screen's heading, or any Screen's when no navigator draws its header.
export function ScreenHeadingBody(props: ScreenHeaderInput): ReactElement {
  return (
    <View className="py-6">
      <ScreenColumn width={props.width}>
        <View className="gap-1" style={headingInset(useHeadingInset())}>
          <HeadingRow {...props} />
          <ScreenCaption caption={props.caption} />
        </View>
      </ScreenColumn>
    </View>
  );
}

// A phone-width page of grouped cards starts its title and caption on its rows' text line.
const headingInset = (inset: number): ViewStyle => ({
  paddingLeft: inset,
  paddingRight: inset,
});

// A wide page's caption; a phone leaves it out, as its native header has no room for it.
function ScreenCaption({ caption }: Pick<ScreenProps, 'caption'>): ReactNode {
  const wide = useWide();

  if (!caption || !wide) return null;

  return (
    <Text role="body" tone="muted">
      {caption}
    </Text>
  );
}

type HeadingContent = { title: ReactNode; actions: ReactNode };

/*
 * A page's heading sits in its own column; a list column's is denser, its title one level down, its buttons small and
 * its search the sidebar's, since it sits above a list beside its page. A List that is selecting replaces it with its
 * own header (ADR-0043).
 */
export type HeadingPlacement = 'page' | 'list';

type HeadingRowProps = ScreenHeaderInput & { placement?: HeadingPlacement };

export function HeadingRow(props: HeadingRowProps): ReactNode {
  const { placement = 'page' } = props;

  if (props.selectionMode?.header) return props.selectionMode.header;

  const content = {
    title: <ScreenTitle title={props.title} level={titleLevels[placement]} />,
    actions: <HeadingActions {...props} size={buttonSizes[placement]} />,
  };

  return (
    <View>
      <ScreenBack onBack={props.onBack} />
      <Heading content={content} page={props} placement={placement} />
    </View>
  );
}

const buttonSizes: Record<HeadingPlacement, IconButtonSize | undefined> = {
  page: undefined,
  list: 'sm',
};

function Heading(props: {
  content: HeadingContent;
  page: ScreenProps;
  placement: HeadingPlacement;
}): ReactElement {
  if (props.page.search)
    return (
      <SearchHeading
        content={props.content}
        page={props.page}
        sidebar={props.placement === 'list'}
      />
    );

  return <PlainHeading {...props.content} />;
}

function PlainHeading(props: HeadingContent): ReactElement {
  return (
    <View className="h-10 flex-row items-center gap-1">
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.actions}
    </View>
  );
}

// The Screen's own Actions, split as one header with one overflow menu, then its primary Action.
export function HeadingActions(
  props: Pick<ScreenHeaderInput, 'header' | 'selectionMode'> & {
    size?: IconButtonSize;
  },
): ReactElement {
  const { groups, label, primary } = props.header;
  const { size } = props;

  return (
    <>
      <SelectEntry mode={props.selectionMode} />
      <DeclaredActions groups={groups} label={label} size={size} />
      <DeclaredActions groups={primary} label={label} size={size} />
    </>
  );
}

function DeclaredActions(
  props: Omit<HeaderActionsProps, 'slots'>,
): ReactElement | null {
  if (!props.groups.length) return null;

  return <HeaderActions {...props} slots={headerSlots} />;
}

// A page's title is its heading; a list column's sits a level below it, under the window's own page title.
const titleLevels = { page: 1, list: 2 } as const;

const titleProps = {
  role: 'title',
  accessibilityRole: 'heading',
  numberOfLines: 1,
} as const;

function ScreenTitle(props: {
  title?: string;
  level: number;
}): ReactElement | null {
  if (!props.title) return null;

  return (
    <Text {...titleProps} aria-level={props.level}>
      {props.title}
    </Text>
  );
}
