import type { ReactElement } from 'react';
import { useClaim, useOfferedPlace } from '#kit/place';
import { Text } from '#primitives/content/text';
import { ScreenBandPlaceOffer, type ScreenBand } from './screen-band';
import { HeadingActions } from './screen-heading-actions';
import type { ScreenHeaderInput } from './screen-props';

// Drawn where a header-only Screen's plan puts its header in the band; a preview has no band offered to claim.
export function ScreenBandClaim(props: ScreenHeaderInput): null {
  useClaim(useOfferedPlace(ScreenBandPlaceOffer), bandOf(props));

  return null;
}

// An empty header declares no menu; what the band does with the empty slot is the band's own business.
function bandOf(props: ScreenHeaderInput): ScreenBand {
  const header = props.headers.heading;

  return {
    title: <BandTitle title={props.title} />,
    menu: header.empty ? null : <HeadingActions header={header} />,
  };
}

function BandTitle(
  props: Pick<ScreenHeaderInput, 'title'>,
): ReactElement | null {
  if (!props.title) return null;

  return (
    <Text
      role="heading"
      accessibilityRole="heading"
      aria-level={2}
      numberOfLines={1}
    >
      {props.title}
    </Text>
  );
}
