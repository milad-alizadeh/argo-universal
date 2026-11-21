import type * as React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import type { Box } from '../../../../lib/product/plugin-registry/draft-commenting';

export interface DraftCommentMarkProps {
  // The notes left on the node; its pin shows how many.
  count: number;
  // The node the editor is open on.
  selected: boolean;
  // Where a node that draws no box of its own is, so its marks are laid over the window instead of inside it.
  box?: Box | null;
}

/*
 * What the App draws over a node while the author comments: an outline on the node being commented on, and a pin
 * on a node that has notes. Neither takes a touch, so the node under them stays what a press picks.
 */
export function DraftCommentMark({
  count,
  selected,
  box,
}: DraftCommentMarkProps): React.JSX.Element | null {
  if (!selected && count === 0) return null;

  // A node measured in the window has its marks laid over it there.
  if (box === null) return null;

  const laid = box && {
    outline: { left: box.x, top: box.y, width: box.width, height: box.height },
    pin: { left: box.x + box.width - 26, top: box.y + 4 },
  };

  return (
    <>
      {selected && (
        <View
          pointerEvents="none"
          style={laid?.outline}
          className={`${laid ? 'fixed' : 'absolute inset-0'} border border-border bg-selected`}
        />
      )}
      {count > 0 && <DraftCommentPin count={count} style={laid?.pin} />}
    </>
  );
}

// A speech-bubble pin inside the node's top-right corner, its tail at the lower left. Inside, since the kit's lists clip a row to its own box.
export function DraftCommentPin({
  count,
  style,
}: {
  count: number;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      role="img"
      aria-label={count === 1 ? '1 comment' : `${count} comments`}
      style={style}
      className={`${style ? 'fixed' : 'absolute right-1 top-1'} size-5.5 items-center justify-center rounded-full rounded-bl-grouped-inner bg-warning shadow-control`}
    >
      <Text className="type-badge text-primary-foreground">{count}</Text>
    </View>
  );
}
