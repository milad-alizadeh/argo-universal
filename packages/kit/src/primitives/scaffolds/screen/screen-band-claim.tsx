import type { ReactElement } from 'react';
import { useClaim, useOfferedPlace } from '#kit/place';
import { screenHeader } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ScreenBandPlace, type ScreenBand } from './screen-band';
import { HeadingActions } from './screen-heading-actions';
import type { ScreenHeaderInput } from './screen-props';

// Drawn where a header-only Screen's plan puts its header in the band; a preview has no band offered to claim.
export function ScreenBandClaim(props: ScreenHeaderInput): null {
  useClaim(useOfferedPlace(ScreenBandPlace), bandOf(props));

  return null;
}

// An empty header leaves the menu to the band, which keeps its own control box.
function bandOf(props: ScreenHeaderInput): ScreenBand {
  const header = screenHeader(props.declaration, 'heading');

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
