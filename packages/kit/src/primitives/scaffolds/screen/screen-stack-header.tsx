import type { ReactElement } from 'react';
import { ActionShortcutScope } from '#primitives/actions/action';
import { ScreenHeadingBody } from './screen-heading-row';
import { ScreenNavigation } from './screen-navigation';
import { PageOptionsSheet } from './screen-page-options';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useHeaderDrawing } from './use-header-drawing';

export type ScreenStackHeaderProps = Omit<ScreenProps, 'children'>;

// The shared Screen header for a page with its own body layout, such as the Session Feed.
export function ScreenStackHeader(props: ScreenStackHeaderProps): ReactElement {
  // A header-only Screen has no List below it to select.
  const drawing = { ...props, ...useHeaderDrawing(props, 'header only', null) };

  return (
    <ActionShortcutScope>
      <ShortcutAnchors anchors={drawing.declaration.anchors} />
      <ScreenNavigation {...drawing} />
      {drawing.plan.site === 'heading' ? (
        <ScreenHeadingBody {...drawing} standalone />
      ) : null}
      <PageOptionsSheet options={drawing.pageOptions} />
    </ActionShortcutScope>
  );
}
