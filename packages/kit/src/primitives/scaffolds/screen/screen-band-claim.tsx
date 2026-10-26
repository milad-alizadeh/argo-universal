import { useIsFocused } from 'expo-router';
import { NavigationContext } from 'expo-router/react-navigation';
import { use, type ReactElement } from 'react';
import { useClaim } from '#kit/claim-store';
import { useWide } from '#kit/use-wide/use-wide';
import { Text } from '#primitives/content/text';
import {
  ScreenBandHostContext,
  type ScreenBand,
  type ScreenBandHost,
} from './screen-band';
import { HeadingActions } from './screen-heading-row';
import type { ScreenHeaderInput } from './screen-props';

// On a wide window a header-only Screen's title and Actions are the band's; a window below wide, or a preview, has no band.
export function ScreenBandClaim(props: ScreenHeaderInput): ReactElement | null {
  const host = use(ScreenBandHostContext);
  const wide = useWide();

  if (!host || !wide) return null;

  return <BandClaimFocus {...props} host={host} />;
}

type BandClaimProps = ScreenHeaderInput & { host: ScreenBandHost };

// A page the navigator keeps behind the shown one gives the band up; without a navigator, a Screen is always shown.
function BandClaimFocus(props: BandClaimProps): ReactElement {
  if (!use(NavigationContext)) return <BandClaim {...props} focused />;

  return <NavigatedBandClaim {...props} />;
}

function NavigatedBandClaim(props: BandClaimProps): ReactElement {
  return <BandClaim {...props} focused={useIsFocused()} />;
}

function BandClaim({
  host,
  focused,
  ...props
}: BandClaimProps & { focused: boolean }): null {
  useClaim(focused ? host : undefined, bandOf(props));

  return null;
}

// A header with no Actions leaves the menu to the band, which keeps its own control box.
const bandOf = (props: ScreenHeaderInput): ScreenBand => ({
  title: <BandTitle title={props.title} />,
  menu: hasActions(props) ? <HeadingActions header={props.header} /> : null,
});

const hasActions = ({ header }: Pick<ScreenHeaderInput, 'header'>): boolean =>
  header.groups.length + header.primary.length > 0;

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
