import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useHeadingInset } from '#kit/content-column/content-column';
import { useEnlargedText } from '#kit/enlarged-text';
import type { ScreenHeader } from '#primitives/actions/action';
import {
  chromeControlSize,
  FixedSizeChrome,
  type IconButtonSize,
} from '#primitives/actions/icon-button';
import { ScreenBack } from './screen-back';
import { ScreenCaption } from './screen-caption';
import { insetWidth, ScreenColumn } from './screen-column';
import { HeadingActions } from './screen-heading-actions';
import { HeadingLayout, type HeadingContent } from './screen-heading-layout';
import { SearchHeading } from './screen-heading-search';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';
import { ScreenTitle } from './screen-title-menu';

/*
 * The Screen's own heading, drawn where its plan puts the header there. Wide, it starts at the body's top, which
 * `wide:mt-frame-inset` sets level with the rail's first tile, so its title sits on the sidebar title's line.
 */
export function ScreenHeadingBody(props: ScreenHeaderInput): ReactElement {
  return (
    <View className="py-6 wide:pt-0">
      <ScreenColumn width={insetWidth(props.width)}>
        <View className="gap-1" style={headingInset(useHeadingInset())}>
          <HeadingRow {...props} />
          <HeadingCaption {...props} />
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

// A List that is selecting owns the header, so the page's caption stands down with its title.
function HeadingCaption(props: ScreenHeaderInput): ReactNode {
  const { selecting } = props.headers.heading;

  return (
    <ScreenCaption
      caption={selecting ? undefined : props.caption}
      captionHref={props.captionHref}
    />
  );
}

/*
 * A page's heading sits in its own column; a list column's is denser, its title one level down and its search the
 * sidebar's, its buttons the window band's size, since it sits above a list beside its page. A List that is selecting replaces it with its
 * own header (ADR-0043).
 */
type HeadingPlacement = 'page' | 'list';

type HeadingRowProps = ScreenHeaderInput & { placement?: HeadingPlacement };

export function HeadingRow(props: HeadingRowProps): ReactNode {
  const header = props.headers.heading;

  return (
    header.selecting ?? (
      <FixedSizeChrome>
        <DeclaredHeading {...props} header={header} />
      </FixedSizeChrome>
    )
  );
}

type DeclaredHeadingProps = HeadingRowProps & { header: ScreenHeader };

function DeclaredHeading(props: DeclaredHeadingProps): ReactElement {
  const { placement = 'page' } = props;

  return (
    <View>
      <ScreenBack onBack={props.onBack} />
      <Heading
        content={headingContent(props, placements[placement])}
        page={props}
        placement={placement}
      />
    </View>
  );
}

type Look = { titleLevel: number; buttonSize: IconButtonSize };

// The title, a menu button when it has a menu, and the header's buttons, in the placement's looks.
const headingContent = (
  props: DeclaredHeadingProps,
  look: Look,
): HeadingContent => ({
  title: headingTitle(props, look),
  actions: headingActions(props, look),
});

const headingTitle = (
  props: DeclaredHeadingProps,
  look: Look,
): ReactElement => (
  <ScreenTitle
    title={props.title}
    level={look.titleLevel}
    groups={props.titleGroups}
  />
);

const headingActions = (
  props: DeclaredHeadingProps,
  look: Look,
): ReactElement => (
  <HeadingActions
    header={props.header}
    size={look.buttonSize}
    options={props.pageOptions}
  />
);

/*
 * A page's title is its heading; a list column's sits a level below it, under the window's own page title. Both draw
 * the chrome's control size, so a list column's buttons match its search and the band above.
 */
const placements: Record<HeadingPlacement, Look & { sidebar: boolean }> = {
  page: { titleLevel: 1, buttonSize: chromeControlSize, sidebar: false },
  list: { titleLevel: 2, buttonSize: chromeControlSize, sidebar: true },
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
  return <HeadingLayout {...props} stacked={useEnlargedText()} />;
}
