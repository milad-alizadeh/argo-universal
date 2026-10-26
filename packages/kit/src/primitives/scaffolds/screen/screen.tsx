import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ColumnScope } from '#kit/content-column/content-column';
import {
  SelectionModeScope,
  useClaimedSelectionMode,
} from '#kit/selection-mode';
import { ActionShortcutScope } from '#primitives/actions/action';
import { SvgBudget } from '#primitives/visual';
import { ScreenAccessory } from './screen-accessory';
import { ScreenBody } from './screen-body';
import { screenHeadersOf } from './screen-headers';
import { ScreenHeadingBody } from './screen-heading-row';
import { ListColumnScreen } from './screen-list-column-screen';
import { ScreenNavigation } from './screen-navigation';
import type { ScreenHeaderPlanned, ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useHeaderDeclaration } from './use-header-declaration';
import { useHeaderPlan } from './use-header-plan';

// Search text is always the caller's: an App's state, or a Plugin's field in Plugin controls.
export function Screen(props: ScreenProps): ReactElement {
  return (
    <SvgBudget>
      <ActionShortcutScope>
        <ColumnScope>
          <ScreenSurface {...props} />
        </ColumnScope>
      </ActionShortcutScope>
    </SvgBudget>
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

// The header draws where its plan says (header-site.ts); each site's adapter only draws.
function ScreenHeaderSource(props: ScreenProps): ReactElement {
  const declaration = useHeaderDeclaration(props, useClaimedSelectionMode());
  const plan = useHeaderPlan('screen');

  const drawing = {
    ...props,
    declaration,
    headers: screenHeadersOf(declaration),
    plan,
  };

  if (plan.site === 'list column') return <ListColumnScreen {...drawing} />;

  return <ScreenDrawing {...drawing} />;
}

// Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered.
function ScreenDrawing(props: ScreenHeaderPlanned): ReactElement {
  return (
    <View
      testID={props.testID}
      className="min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent"
    >
      <ShortcutAnchors anchors={props.declaration.anchors} />
      <ScreenNavigation {...props} />
      {props.plan.site === 'heading' ? <ScreenHeadingBody {...props} /> : null}
      <ScreenBody {...props} />
      <ScreenAccessory {...props} />
    </View>
  );
}
