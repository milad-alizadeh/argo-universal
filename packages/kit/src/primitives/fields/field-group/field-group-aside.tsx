import type { ReactElement, ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { OutsideColumn } from '#kit/content-column/content-column';
import { useListPlace } from '#kit/list-place';
import type { FieldGroupKitProps } from '../../kit-props';
import { ColumnFieldGroup } from './field-group-form';

// Expo's own content padding, which the aside gives up so the cards start on the column's edge, as the title does.
const expoPadding = 16;

/*
 * In a Screen's aside the Form is the page's own, its rows and cards unchanged, but it neither scrolls nor takes the
 * column: Expo's scroll view sizes to its sections, so it scrolls with the aside or the body that holds it.
 */
const fitted: ViewStyle = {
  backgroundColor: 'transparent',
  flexGrow: 0,
  flexShrink: 0,
  flexBasis: 'auto',
  margin: -expoPadding,
};

/*
 * In a sheet's inset the cards keep the sheet's edge at the sides and the gap of what sits above them, but keep Expo's
 * space under the last card, which ends the sheet or popover.
 */
const insetFitted: ViewStyle = {
  ...fitted,
  margin: 0,
  marginHorizontal: -expoPadding,
  marginTop: -expoPadding,
};

export function AsideFieldGroup(
  props: FieldGroupKitProps<'FieldGroup'> & { children?: ReactNode },
): ReactElement {
  const style = useListPlace() === 'inset' ? insetFitted : fitted;

  return (
    <OutsideColumn>
      <ColumnFieldGroup {...props} style={style} />
    </OutsideColumn>
  );
}
