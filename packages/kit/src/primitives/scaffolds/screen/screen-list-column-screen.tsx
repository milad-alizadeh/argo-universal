import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useClaim } from '#kit/place';
import { HeadingRow } from './screen-heading-row';
import { ScreenInPage, useListColumnHeading } from './screen-list-column';
import type { ScreenHeaderInput } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';

/*
 * A Screen that is the content of a list column: its heading goes up to the column's top row, and the list below
 * keeps the column's own padding, scroll column and fades.
 */
export function ListColumnScreen({
  children,
  ...props
}: ScreenHeaderInput): ReactElement {
  useClaim(useListColumnHeading(), <HeadingRow {...props} placement="list" />);

  return (
    <View testID={props.testID} className="min-h-0 flex-1">
      <ShortcutAnchors anchors={props.declaration.anchors} />
      <ScreenInPage>{children}</ScreenInPage>
    </View>
  );
}
