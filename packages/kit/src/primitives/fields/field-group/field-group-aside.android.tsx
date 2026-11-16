import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { OutsideColumn } from '#kit/content-column/content-column';
import { GroupDisabledContext } from '#primitives/fields/field-row';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import { rowSpacing } from './field-group-caption-insets';
import { sectionedRows } from './field-group-runs.android';

const columnModifiers = [fillMaxWidth()];

/*
 * In a Screen's aside the page's Compose FieldGroup keeps its sections and rows, laid out as a Column rather than a
 * LazyColumn: its Host takes the rows' height, so it scrolls with the aside or the body that holds it, and it takes no
 * column of the Screen's.
 */
type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

export function AsideFieldGroup(props: AsideProps): ReactElement {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <GroupDisabledContext.Provider value={props.disabled ?? false}>
        <InsideHostContext.Provider value>
          <OutsideColumn>
            <Rows>{props.children}</Rows>
          </OutsideColumn>
        </InsideHostContext.Provider>
      </GroupDisabledContext.Provider>
    </Host>
  );
}

const Rows = ({ children }: Pick<AsideProps, 'children'>): ReactElement => (
  <Column
    verticalArrangement={{ spacedBy: rowSpacing }}
    modifiers={columnModifiers}
  >
    {sectionedRows(children)}
  </Column>
);
