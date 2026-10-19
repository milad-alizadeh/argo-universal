import { useContext, useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import {
  ListContext,
  listPosition,
  type ListPosition,
} from '../../../list-context';
import { useOpensGroup, type RowGroupEnds } from '../../../row-group-ends';

// Android puts a row's description in its subtitle, so only other platforms draw it as a footer.
const footerEndsGroup = Platform.OS !== 'android';

const opensAt = new Set<ListPosition>(['first', 'only']);

const endsAt = new Set<ListPosition>(['last', 'only']);

/*
 * A row's place in its group: a row whose description draws as a footer ends the group, so it
 * takes the bottom corners and no separator, and the row after it opens a new group.
 */
export function useGroupPosition(description?: string): ListPosition {
  const { position, highlights, index } = useContext(ListContext);
  const groupEnds = highlights?.groupEnds;
  const ends = endsGroup(description);

  useMarkGroupEnd(groupEnds, index, ends);
  const opens = useOpensGroup(groupEnds, index);

  return regrouped(position, opens, ends);
}

const endsGroup = (description?: string): boolean =>
  footerEndsGroup && !!description;

const regrouped = (
  position: ListPosition,
  opens: boolean,
  ends: boolean,
): ListPosition =>
  listPosition(opensAt.has(position) || opens, endsAt.has(position) || ends);

function useMarkGroupEnd(
  groupEnds: RowGroupEnds | undefined,
  index: number | undefined,
  ends: boolean,
): void {
  useLayoutEffect(() => {
    if (!groupEnds || index === undefined) return;

    groupEnds.mark(index, ends);

    return (): void => groupEnds.mark(index, false);
  }, [groupEnds, index, ends]);
}
