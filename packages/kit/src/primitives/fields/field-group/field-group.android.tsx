import { LazyColumn } from '@expo/ui/jetpack-compose';
import { fillMaxSize, imePadding } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  fieldGroupColumnStyle,
  OutsideColumn,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { useInAside } from '#kit/list-place';
import { GroupDisabledContext } from '#primitives/fields/field-row';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideFieldGroup } from './field-group-aside.android';
import { contentPadding, rowSpacing } from './field-group-caption-insets';
import { fieldGroupRowComponents } from './field-group-row-components';
import { sectionedRows } from './field-group-runs.android';
import { FieldGroupSection } from './field-group-section.android';

export type FieldGroupProps = FieldGroupKitProps<'FieldGroup'> & {
  children?: ReactNode;
};

/*
 * ADR-0042: the kit's own Android FieldGroup, a copy of Expo UI's (FieldGroup.android.tsx) whose Section draws
 * each row as itself. It goes when Expo fixes the headline wrapping (expo/expo#50086).
 */
function FieldGroupRoot(props: FieldGroupProps): ReactElement {
  return useInAside() ? (
    <AsideFieldGroup {...props} />
  ) : (
    <PageFieldGroup {...props} />
  );
}

function PageFieldGroup(props: FieldGroupProps): ReactElement {
  /*
   * Its cards keep Material's own inset, so the Screen adds no gutter beyond the column's own; its rows are outside the column.
   * A View is the column, as the web's scroll view is: capped, centred and padded, so the cards start on the title's line.
   * Compose's Host ignores the padding and honours the cap, so the padding sits on the View around it.
   */
  const column = fieldGroupColumnStyle(useClaimColumn('grouped'));

  return (
    <View style={{ flex: 1, ...column }}>
      <HostedGroup {...props} />
    </View>
  );
}

function HostedGroup(props: FieldGroupProps): ReactElement {
  return (
    <Host style={{ flex: 1 }}>
      <GroupDisabledContext.Provider value={props.disabled ?? false}>
        <InsideHostContext.Provider value>
          <OutsideColumn>
            <Column>{props.children}</Column>
          </OutsideColumn>
        </InsideHostContext.Provider>
      </GroupDisabledContext.Provider>
    </Host>
  );
}

/*
 * Expo's layout (field-group-caption-insets.ts) as a LazyColumn. It fills the page and has no background of its
 * own, so the page's shows between the section cards. It ends above the keyboard, so Compose scrolls a focused
 * field into view as it does in any Material form. Each section break is an item of its own, so two sections
 * never read as one list of rows whatever the sheet or page they sit in.
 */
function Column(props: Pick<FieldGroupProps, 'children'>): ReactElement {
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: rowSpacing }}
      contentPadding={contentPadding}
      modifiers={[fillMaxSize(), imePadding()]}
    >
      {sectionedRows(props.children)}
    </LazyColumn>
  );
}

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldGroupSection,
  ...fieldGroupRowComponents,
});
