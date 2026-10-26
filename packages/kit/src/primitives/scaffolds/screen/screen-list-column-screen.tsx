import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useClaim } from '#kit/claim-store';
import { HeadingRow } from './screen-heading-row';
import { ScreenInPage, type ListColumnHeading } from './screen-list-column';
import type { ScreenProps } from './screen-props';
import { ShortcutAnchors } from './screen-shortcut-anchors';
import { useScreenHeader } from './use-screen-header';

type ListColumnScreenProps = ScreenProps & { heading: ListColumnHeading };

/*
 * A Screen that is the content of a list column: its heading goes up to the column's top row, and the list below
 * keeps the column's own padding, scroll column and fades.
 */
export function ListColumnScreen({
  heading,
  children,
  ...props
}: ListColumnScreenProps): ReactElement {
  const header = useScreenHeader(props);
  useClaim(heading, <HeadingRow {...props} header={header} placement="list" />);

  return (
    <View testID={props.testID} className="min-h-0 flex-1">
      <ShortcutAnchors header={header} />
      <ScreenInPage>{children}</ScreenInPage>
    </View>
  );
}
