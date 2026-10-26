import type { ReactElement } from 'react';
import { ActionShortcutScope } from '#primitives/actions/action';
import { ScreenBandClaim } from './screen-band-claim';
import { ScreenNavigation } from './screen-navigation';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useScreenHeader } from './use-screen-header';

export type ScreenStackHeaderProps = Omit<ScreenProps, 'children'>;

// Kit-only. A Screen's header without its heading or body, for a page whose body is not a Screen, such as a Session's; a wide window draws it in the band.
export function ScreenStackHeader(props: ScreenStackHeaderProps): ReactElement {
  const header = useScreenHeader(props);

  return (
    <ActionShortcutScope>
      <ShortcutAnchors header={header} />
      <ScreenNavigation {...props} header={header} />
      <ScreenBandClaim {...props} header={header} />
    </ActionShortcutScope>
  );
}
