import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  fieldGroupColumnStyle,
  OutsideColumn,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { useInAside, useInMenu } from '#kit/list-place';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideFieldGroup } from './field-group-aside';
import { ColumnFieldGroup, transparent } from './field-group-form';
import { MenuFieldGroup } from './field-group-menu';
import { fieldGroupRowComponents } from './field-group-row-components';
import { FieldGroupSection } from './field-group-section';

export type FieldGroupProps = FieldGroupKitProps<'FieldGroup'> & {
  children?: ReactNode;
};

const drawings = {
  menu: MenuFieldGroup,
  aside: AsideFieldGroup,
  page: PageFieldGroup,
};

// A popover's menu rows, the aside's rows sized to themselves, or the page's own Form.
function useDrawing(): keyof typeof drawings {
  const menu = useInMenu();
  const aside = useInAside();

  if (menu) return 'menu';

  return aside ? 'aside' : 'page';
}

/*
 * ADR-0042: Expo UI's universal FieldGroup on the web and iOS (SwiftUI's Form), scrolling itself. It reads its
 * sections by element type, so each FieldGroup.Section child becomes Expo's own section element here, and nothing
 * else sits between it and them (the web draws any other child as a card of its own). Android
 * draws its own (field-group.android.tsx). In a Screen's aside the same Form sizes to its rows (field-group-aside).
 */
function FieldGroupRoot(props: FieldGroupProps): ReactElement {
  const Drawing = drawings[useDrawing()];

  return <Drawing {...props} />;
}

/*
 * Grouped cards claim the Screen's column and keep to it themselves; their rows are outside it. A View is the column,
 * as Android's is: SwiftUI's Form takes only a numeric width and padding from a style, so on iOS a maxWidth on the
 * group itself is dropped and the cards run the pane's full width (#1748). The View around the Host honours the cap
 * and the padding on every platform.
 */
function PageFieldGroup(props: FieldGroupProps): ReactElement {
  const column = fieldGroupColumnStyle(useClaimColumn('grouped'));

  return (
    <View style={{ flex: 1, ...column }}>
      <Host style={{ flex: 1 }}>
        <InsideHostContext.Provider value>
          <OutsideColumn>
            <ColumnFieldGroup {...props} style={transparent} />
          </OutsideColumn>
        </InsideHostContext.Provider>
      </Host>
    </View>
  );
}

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldGroupSection,
  ...fieldGroupRowComponents,
});
