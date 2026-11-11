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
import { ScreenAside, ScreenLead, useAsideFrame } from './screen-aside';
import type { AsideLayout, AsidePlace } from './screen-aside-place';
import { ScreenBody } from './screen-body';
import { ScreenColumnEdgesContext } from './screen-column';
import { ScreenFooterFrame } from './screen-footer';
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

// The heading, then the body with the aside's Pills over it and the footer under it, beside the aside's column.
function ScreenFrame(
  props: ScreenHeaderPlanned & { place: AsidePlace },
): ReactElement {
  return (
    <ScreenAside aside={props.aside} width={props.width} place={props.place}>
      {props.plan.site === 'heading' ? <ScreenHeadingBody {...props} /> : null}
      <ScreenFooterFrame footer={props.footer} width={props.width}>
        <ScreenLead width={props.width} />
        <ScreenBody {...props} />
      </ScreenFooterFrame>
    </ScreenAside>
  );
}

const drawingClass =
  'min-h-0 flex-1 bg-content wide:mt-frame-inset web:bg-transparent ios:bg-transparent';

// Web: the window paints the content colour, so the sidebar's shadow falls on it uncovered. iOS: the stack paints it, as a painted view here would hide the list from the large title.
function ScreenDrawing(props: ScreenHeaderPlanned): ReactElement {
  const aside = useAsideFrame(props.width);

  return (
    <View
      testID={props.testID}
      onLayout={aside.onLayout}
      className={drawingClass}
    >
      <ShortcutAnchors anchors={props.declaration.anchors} />
      <ScreenColumns {...props} layout={aside} />
      <ScreenEnd {...props} />
    </View>
  );
}

// The frame, with the column where the aside leaves it.
function ScreenColumns({
  layout,
  ...props
}: ScreenHeaderPlanned & { layout: AsideLayout }): ReactElement {
  const edges = layout.column ?? null;

  return (
    <ScreenColumnEdgesContext value={edges}>
      <ScreenFrame {...props} place={layout.place} />
    </ScreenColumnEdgesContext>
  );
}

// After the body: iOS's docked search is a native view, and UIKit's large title only finds a scroll view that comes first.
function ScreenEnd(props: ScreenHeaderPlanned): ReactElement {
  return (
    <>
      <ScreenNavigation {...props} />
      <ScreenAccessory {...props} />
    </>
  );
}
