import type { ReactElement } from 'react';
import { ActionShortcutScope } from '#primitives/actions/action';
import { ScreenBandClaim } from './screen-band-claim';
import { screenHeadersOf } from './screen-headers';
import { ScreenNavigation } from './screen-navigation';
import { PageOptionsSheet } from './screen-page-options';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useHeaderDeclaration } from './use-header-declaration';
import { useHeaderPlan } from './use-header-plan';
import { useScreenExtras, withAnchor } from './use-screen-extras';

export type ScreenStackHeaderProps = Omit<ScreenProps, 'children'>;

// Kit-only. A Screen's header without its heading or body, for a page whose body is not a Screen, such as a Session's; a wide window draws it in the band.
export function ScreenStackHeader(props: ScreenStackHeaderProps): ReactElement {
  // A header-only Screen has no List below it to select.
  const declared = useHeaderDeclaration(props, null);
  const plan = useHeaderPlan('header only');
  const extras = useScreenExtras(props, { selection: null, site: plan.site });
  const declaration = withAnchor(declared, extras.anchor);
  const headers = screenHeadersOf(declaration);

  const drawing = {
    ...props,
    declaration,
    headers,
    titleGroups: extras.titleGroups,
    pageOptions: extras.pageOptions,
    plan,
  };

  return (
    <ActionShortcutScope>
      <ShortcutAnchors anchors={declaration.anchors} />
      <ScreenNavigation {...drawing} />
      {plan.site === 'band' ? <ScreenBandClaim {...drawing} /> : null}
      <PageOptionsSheet options={drawing.pageOptions} />
    </ActionShortcutScope>
  );
}
