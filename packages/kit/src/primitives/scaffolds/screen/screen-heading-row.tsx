import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useHeadingInset } from '#kit/content-column/content-column';
import { useWide } from '#kit/use-wide/use-wide';
import type { ScreenHeader } from '#primitives/actions/action';
import type { IconButtonSize } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Link, isRoute } from '#primitives/content/link';
import { Text } from '#primitives/content/text';
import { ScreenBack } from './screen-back';
import { ScreenColumn } from './screen-column';
import { HeadingActions } from './screen-heading-actions';
import { SearchHeading } from './screen-heading-search';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';

// The Screen's own heading, drawn where its plan puts the header there.
export function ScreenHeadingBody(props: ScreenHeaderInput): ReactElement {
  const header = props.headers.heading;

  return (
    <View className="py-6">
      <ScreenColumn width={props.width}>
        <View className="gap-1" style={headingInset(useHeadingInset())}>
          <HeadingRow {...props} />
          <ScreenCaption
            caption={header.selecting ? undefined : props.caption}
            captionHref={props.captionHref}
          />
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
function ScreenCaption({
  caption,
  captionHref,
}: Pick<ScreenProps, 'caption' | 'captionHref'>): ReactNode {
  const wide = useWide();

  if (!caption || !wide) return null;

  if (!captionHref)
    return (
      <Text role="body" tone="muted">
        {caption}
      </Text>
    );

  return <CaptionLink caption={caption} href={captionHref} />;
}

// A caption that goes somewhere says so with a link glyph after it, as the page's one link out.
function CaptionLink({
  caption,
  href,
}: {
  caption: string;
  href: string;
}): ReactNode {
  return (
    <View className="flex-row items-center gap-1">
      <Text role="body" tone="muted">
        <Link label={caption} {...captionTarget(href)} />
      </Text>
      <Icon name="external-link" size="sm" tone="muted" />
    </View>
  );
}

// One `href` is an App route or a URL, as a Metadata link's is; the kit Link takes them apart.
const captionTarget = (href: string): { href: string } | { route: string } =>
  isRoute(href) ? { route: href } : { href };

type HeadingContent = { title: ReactNode; actions: ReactNode };

/*
 * A page's heading sits in its own column; a list column's is denser, its title one level down, its buttons small and
 * its search the sidebar's, since it sits above a list beside its page. A List that is selecting replaces it with its
 * own header (ADR-0043).
 */
type HeadingPlacement = 'page' | 'list';

type HeadingRowProps = ScreenHeaderInput & { placement?: HeadingPlacement };

export function HeadingRow(props: HeadingRowProps): ReactNode {
  const header = props.headers.heading;

  return header.selecting ?? <DeclaredHeading {...props} header={header} />;
}

type DeclaredHeadingProps = HeadingRowProps & { header: ScreenHeader };

function DeclaredHeading(props: DeclaredHeadingProps): ReactElement {
  const { placement = 'page' } = props;
  const look = placements[placement];

  const content = {
    title: <ScreenTitle title={props.title} level={look.titleLevel} />,
    actions: <HeadingActions header={props.header} size={look.buttonSize} />,
  };

  return (
    <View>
      <ScreenBack onBack={props.onBack} />
      <Heading content={content} page={props} placement={placement} />
    </View>
  );
}

// A page's title is its heading; a list column's sits a level below it, under the window's own page title.
const placements: Record<
  HeadingPlacement,
  { titleLevel: number; buttonSize?: IconButtonSize; sidebar: boolean }
> = {
  page: { titleLevel: 1, sidebar: false },
  list: { titleLevel: 2, buttonSize: 'sm', sidebar: true },
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
        sidebar={placements[props.placement].sidebar}
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
