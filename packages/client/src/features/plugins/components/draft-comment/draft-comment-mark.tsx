import type * as React from 'react';
import { Text, View } from 'react-native';

export interface DraftCommentMarkProps {
  // The notes left on the node; its pin shows how many.
  count: number;
  // The node the editor is open on.
  selected: boolean;
}

/*
 * What the App draws over a node while the author comments: an outline on the node being commented on, and a pin
 * on a node that has notes. Neither takes a touch, so the node under them stays what a press picks.
 */
export function DraftCommentMark({
  count,
  selected,
}: DraftCommentMarkProps): React.JSX.Element | null {
  if (!selected && count === 0) return null;

  return (
    <>
      {selected && (
        <View
          pointerEvents="none"
          className="absolute inset-0 border border-border bg-selected"
        />
      )}
      {count > 0 && <DraftCommentPin count={count} />}
    </>
  );
}

// A speech-bubble pin inside the node's top-right corner, its tail at the lower left. Inside, since the kit's lists clip a row to its own box.
export function DraftCommentPin({
  count,
}: {
  count: number;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      role="img"
      aria-label={count === 1 ? '1 comment' : `${count} comments`}
      className="absolute right-1 top-1 size-5.5 items-center justify-center rounded-full rounded-bl-grouped-inner bg-warning shadow-control"
    >
      <Text className="type-badge text-primary-foreground">{count}</Text>
    </View>
  );
}
