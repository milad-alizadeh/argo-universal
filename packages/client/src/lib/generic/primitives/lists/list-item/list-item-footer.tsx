import { useContext, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { ListTileContext, type ListPosition } from '../../../list-context';
import { ListFooter } from '../../../list-footer';

const sectionEnds = new Set<ListPosition>(['last', 'only']);

const footerGap = (position: ListPosition): string | undefined =>
  sectionEnds.has(position) ? undefined : 'mb-4';

// iOS: a row's description closes its group; a section's gap separates it from the group after it.
export function RowFooter(props: {
  description?: string;
  position: ListPosition;
}): ReactNode {
  const tile = useContext(ListTileContext);

  if (tile || !hasFooter(props.description)) return null;

  return (
    <View className={footerGap(props.position)}>
      <ListFooter text={props.description} />
    </View>
  );
}

function hasFooter(description: string | undefined): description is string {
  return Boolean(description) && Platform.OS === 'ios';
}
