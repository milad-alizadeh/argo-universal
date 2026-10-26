import {
  useContext,
  useLayoutEffect,
  type ContextType,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import {
  ListContext,
  ListTileContext,
  listPosition,
  type ListPosition,
} from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { useListLook } from '../../../list-look-context';
import {
  ListGroupEndsContext,
  useOpensGroup,
  type ListGroupEnds,
} from './list-group-ends';

const opensAt = new Set<ListPosition>(['first', 'only']);

const endsAt = new Set<ListPosition>(['last', 'only']);

type ListItemGroup = {
  context: ContextType<typeof ListContext>;
  footer: ReactNode;
};

export function useListItemGroup(description?: string): ListItemGroup {
  const list = useContext(ListContext);
  const rowDescription = useRowDescription(description);
  const ends = useContext(ListGroupEndsContext);
  const closes = useClosesGroup(rowDescription);
  useMarkGroupEnd(ends, list.index, closes);
  const opens = useOpensGroup(ends, list.index);

  const position = listPosition(
    opensAt.has(list.position) || opens,
    endsAt.has(list.position) || closes,
  );

  return drawing(list, position, rowDescription);
}

function useClosesGroup(description?: string): boolean {
  const { footerEndsGroup } = useListLook();

  return footerEndsGroup && !!description;
}

function useRowDescription(description?: string): string | undefined {
  return useContext(ListTileContext) ? undefined : description;
}

const footerGap = (position: ListPosition): string | undefined =>
  endsAt.has(position) ? undefined : 'mb-4';

function drawing(
  list: ContextType<typeof ListContext>,
  position: ListPosition,
  description?: string,
): ListItemGroup {
  return {
    context: { ...list, position },
    footer: <RowFooter description={description} position={list.position} />,
  };
}

function useMarkGroupEnd(
  ends: ListGroupEnds | undefined,
  index: number | undefined,
  closes: boolean,
): void {
  useLayoutEffect(() => {
    if (!ends || index === undefined) return;

    return ends.register(index, closes);
  }, [ends, index, closes]);
}

// Footer spacing follows the original Section position; corners follow the regrouped position.
function RowFooter({
  description,
  position,
}: {
  description?: string;
  position: ListPosition;
}): ReactNode {
  const { footerEndsGroup } = useListLook();

  if (!description || !footerEndsGroup) return null;

  return (
    <View className={footerGap(position)}>
      <ListFooter text={description} />
    </View>
  );
}
