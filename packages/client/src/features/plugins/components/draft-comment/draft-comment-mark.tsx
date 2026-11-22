import type * as React from 'react';
import { Text, type ViewStyle } from 'react-native';
import type { Box } from '../../../../lib/product/plugin-registry/draft-commenting';
import { WindowPlacedView } from './window-placed-view';

const pinSize = 22;

const pinInset = 4;

export interface DraftCommentMarkProps {
  count: number;
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

  if (box === null) return null;

  const laid = box && {
    // On the node's own edge, since a list clips a row to its box and would cut an outline drawn outside it.
    outline: {
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      borderRadius: box.radius ?? 0,
    },
    pin: {
      left: box.x + box.width - pinSize - pinInset,
      top: box.y + pinInset,
    },
  };

  return (
    <>
      {selected && <Outline style={laid?.outline} />}
      {count > 0 && <DraftCommentPin count={count} style={laid?.pin} />}
    </>
  );
}

function Outline({ style }: { style?: ViewStyle }): React.JSX.Element {
  return (
    <WindowPlacedView
      pointerEvents="none"
      style={style}
      className={`${style ? 'fixed' : 'absolute inset-0 rounded-lg'} border border-border`}
    />
  );
}

// A speech-bubble pin inside the node's top-right corner, its tail at the lower left. Inside, since the kit's lists clip a row to its own box.
function DraftCommentPin({
  count,
  style,
}: {
  count: number;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <WindowPlacedView
      pointerEvents="none"
      role="img"
      aria-label={count === 1 ? '1 comment' : `${count} comments`}
      style={style}
      className={`${style ? 'fixed' : 'absolute right-1 top-1'} size-5.5 items-center justify-center rounded-full rounded-bl-grouped-inner bg-warning shadow-control`}
    >
      <Text className="type-badge text-primary-foreground">{count}</Text>
    </WindowPlacedView>
  );
}
