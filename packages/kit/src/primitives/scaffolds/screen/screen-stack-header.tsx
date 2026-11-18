import type { ReactElement } from 'react';
import { ActionShortcutScope } from '#primitives/actions/action';
import { ScreenBandClaim } from './screen-band-claim';
import { ScreenNavigation } from './screen-navigation';
import { PageOptionsSheet } from './screen-page-options';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useHeaderDrawing } from './use-header-drawing';

export type ScreenStackHeaderProps = Omit<ScreenProps, 'children'>;

// Kit-only. A Screen's header without its heading or body, for a page whose body is not a Screen, such as a Session's; a wide window draws it in the band.
export function ScreenStackHeader(props: ScreenStackHeaderProps): ReactElement {
  // A header-only Screen has no List below it to select.
  const drawing = { ...props, ...useHeaderDrawing(props, 'header only', null) };

  return (
    <ActionShortcutScope>
      <ShortcutAnchors anchors={drawing.declaration.anchors} />
      <ScreenNavigation {...drawing} />
      {drawing.plan.site === 'band' ? <ScreenBandClaim {...drawing} /> : null}
      <PageOptionsSheet options={drawing.pageOptions} />
    </ActionShortcutScope>
  );
}
