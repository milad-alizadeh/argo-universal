import { Column } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { GroupDisabledContext } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';
import { AsideHost } from './field-group-aside-host.native';
import { rowSpacing } from './field-group-caption-insets';
import { sectionedRows } from './field-group-runs.android';

const columnModifiers = [fillMaxWidth()];

type AsideProps = FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode };

/*
 * In a Screen's aside the page's Compose FieldGroup keeps its sections and rows, laid out as a Column rather than a
 * LazyColumn, so its Host takes the rows' height.
 */
export function AsideFieldGroup(props: AsideProps): ReactElement {
  return (
    <AsideHost>
      <GroupDisabledContext.Provider value={props.disabled ?? false}>
        <Column
          verticalArrangement={{ spacedBy: rowSpacing }}
          modifiers={columnModifiers}
        >
          {sectionedRows(props.children)}
        </Column>
      </GroupDisabledContext.Provider>
    </AsideHost>
  );
}
