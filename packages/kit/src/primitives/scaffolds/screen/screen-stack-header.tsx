import type { ReactElement, ReactNode } from 'react';
import { useClaim } from '#kit/place';
import { ActionShortcutScope } from '#primitives/actions/action';
import {
  HeadingRow,
  ScreenHeadingBody,
  TitleBarActions,
} from './screen-heading-row';
import { ScreenNavigation } from './screen-navigation';
import { PageOptionsSheet } from './screen-page-options';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useTitleBar } from './screen-title-bar';
import { useHeaderDrawing } from './use-header-drawing';

export type ScreenStackHeaderProps = Omit<ScreenProps, 'children'> & {
  headingColumn?: (children: ReactNode) => ReactNode;
  // Draw the heading in the window's title bar where one is offered, as a document app's window does.
  inTitleBar?: boolean;
};

type Drawing = ScreenStackHeaderProps & ReturnType<typeof useHeaderDrawing>;

// The title bar this header's title and buttons go to, where it asks for one and draws a heading at all.
function useHeadingInTitleBar(drawing: Drawing): boolean {
  const bar = useTitleBar();
  const wanted = drawing.inTitleBar === true && drawing.plan.site === 'heading';
  const target = wanted ? bar : undefined;
  useClaim(target?.title, <HeadingRow {...drawing} placement="bar" />);
  useClaim(target?.actions, <TitleBarActions {...drawing} />);

  return Boolean(target);
}

function StandaloneHeading(props: { drawing: Drawing }): ReactNode {
  const inTitleBar = useHeadingInTitleBar(props.drawing);

  if (inTitleBar || props.drawing.plan.site !== 'heading') return null;

  return <ScreenHeadingBody {...props.drawing} standalone />;
}

// The shared Screen header for a page with its own body layout, such as the Session Feed.
export function ScreenStackHeader(props: ScreenStackHeaderProps): ReactElement {
  // A header-only Screen has no List below it to select.
  const drawing = { ...props, ...useHeaderDrawing(props, 'header only', null) };

  return (
    <ActionShortcutScope>
      <ShortcutAnchors anchors={drawing.declaration.anchors} />
      <ScreenNavigation {...drawing} />
      <StandaloneHeading drawing={drawing} />
      <PageOptionsSheet options={drawing.pageOptions} />
    </ActionShortcutScope>
  );
}
