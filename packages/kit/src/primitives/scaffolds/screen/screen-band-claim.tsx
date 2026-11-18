import type { ReactElement } from 'react';
import { useClaim, useOfferedPlace } from '#kit/place';
import { Text } from '#primitives/content/text';
import { ScreenBandPlaceOffer, type ScreenBand } from './screen-band';
import { HeadingActions } from './screen-heading-actions';
import type { ScreenHeaderInput } from './screen-props';
import { TitleMenu } from './screen-title-menu';

// Drawn where a header-only Screen's plan puts its header in the band; a preview has no band offered to claim.
export function ScreenBandClaim(props: ScreenHeaderInput): null {
  useClaim(useOfferedPlace(ScreenBandPlaceOffer), bandOf(props));

  return null;
}

// An empty header declares no menu; what the band does with the empty slot is the band's own business.
function bandOf(props: ScreenHeaderInput): ScreenBand {
  return {
    title: <BandTitle title={props.title} groups={props.titleGroups} />,
    menu: bandMenu(props),
  };
}

// The band draws the page's options beside its Actions, opening the sheet the header-only Screen holds.
function bandMenu(props: ScreenHeaderInput): ReactElement | null {
  const header = props.headers.heading;

  if (header.empty && !props.pageOptions) return null;

  return <HeadingActions header={header} options={props.pageOptions} />;
}

// A title with a menu is the menu's button, a level below the window's page title, as the band's own title is.
function BandTitle(props: {
  title?: string;
  groups: ScreenHeaderInput['titleGroups'];
}): ReactElement | null {
  if (!props.title) return null;

  if (props.groups.length)
    return <TitleMenu title={props.title} level={2} groups={props.groups} />;

  return <Text {...bandHeading}>{props.title}</Text>;
}

const bandHeading = {
  role: 'heading',
  accessibilityRole: 'heading',
  'aria-level': 2,
  numberOfLines: 1,
} as const;
