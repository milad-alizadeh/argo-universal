import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  HeadingInsetContext,
  useClaimsColumn,
  useHeadingInsetScope,
} from '#kit/heading-inset';
import { SelectionModeScope, useSelectionModeHost } from '#kit/selection-mode';
import { ActionShortcutScope } from '#primitives/actions/action';
import { SvgBudget } from '#primitives/visual';
import { ScreenAccessory } from './screen-accessory';
import { ScreenBody } from './screen-body';
import { ScreenHeading } from './screen-heading';
import { useListColumnHeading } from './screen-list-column';
import { ListColumnScreen } from './screen-list-column-screen';
import { ScreenNavigation } from './screen-navigation';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';
import { selectionScreen } from './screen-selection-mode';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useScreenHeader } from './use-screen-header';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  // A Screen inside another's content keeps its own column, so the outer one leaves it unpadded.
  useClaimsColumn(true);

  return (
    <SvgBudget>
      <ActionShortcutScope>
        <HeadingInsetScope>
          <ScreenSurface {...props} />
        </HeadingInsetScope>
      </ActionShortcutScope>
    </SvgBudget>
  );
}

// The Screen's heading learns from its content whether that is grouped cards.
function HeadingInsetScope(props: { children: ReactNode }): ReactElement {
  return (
    <HeadingInsetContext value={useHeadingInsetScope()}>
      {props.children}
    </HeadingInsetContext>
  );
}

// A List below may select, and then its header replaces this Screen's (ADR-0043).
function ScreenSurface(props: ScreenProps): ReactElement {
  return (
    <SelectionModeScope>
      <ScreenHeaderSource {...props} />
    </SelectionModeScope>
  );
}

type Selecting = ScreenProps & Pick<ScreenHeaderInput, 'selectionMode'>;

// A Screen in a list column hands its heading up to the column; any other draws its own.
function ScreenHeaderSource(props: ScreenProps): ReactElement {
  const selectionMode = useSelectionModeHost();
  const heading = useListColumnHeading();
  const drawing = { ...selectionScreen(props, selectionMode), selectionMode };

  if (heading) return <ListColumnScreen {...drawing} heading={heading} />;

  return <PageSurface {...drawing} />;
}

// The Screen declares its header from its props; its content adds none.
function PageSurface(props: Selecting): ReactElement {
  const header = useScreenHeader(props);

  return <ScreenDrawing {...props} header={header} />;
}

// Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
function ScreenDrawing(props: ScreenHeaderInput): ReactElement {
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <ShortcutAnchors header={props.header} />
      <ScreenNavigation {...props} />
      <ScreenHeading {...props} />
      <ScreenBody {...props} />
      <ScreenAccessory {...props} />
    </View>
  );
}
