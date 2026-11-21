import { SizeClass } from '@repo/kit/size-class/size-class';
import { createContext, useContext, useMemo } from 'react';
import type * as React from 'react';
import {
  DraftCommentingContext,
  type DraftCommenting,
} from '../../../../lib/product/plugin-registry/draft-commenting';
import { useCommentPicking } from '../../hooks/use-comment-picking';
import { useDraftComments } from '../../stores/draft-comments';
import { titleOf } from '../../utils/draft-comment-hit';
import type { PageOpening } from '../../utils/page-addresses';
import { DraftCommentMark } from './draft-comment-mark';
import { DraftCommentSheet } from './draft-comment-sheet';
import { PressHolder, type Press } from './press-holder';

// A press shorter than this is a tap; a phone picks a node only by pressing longer.
const defaultLongPress = 450;

type Marks = { counts: ReadonlyMap<string, number>; picked: string | null };

const MarksContext = createContext<Marks>({ counts: new Map(), picked: null });

// Drawn over every node of the tree while the author comments, from what the App knows of the notes.
function Mark({ address }: { address: string }): React.JSX.Element {
  const { counts, picked } = useContext(MarksContext);

  return (
    <DraftCommentMark
      count={counts.get(address) ?? 0}
      selected={picked === address}
    />
  );
}

function countsOf(addresses: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const address of addresses)
    counts.set(address, (counts.get(address) ?? 0) + 1);

  return counts;
}

type LayerProps = {
  opening: PageOpening;
  commenting: boolean;
  // How long a phone's press is before it picks; a test shortens it.
  longPressMilliseconds?: number;
  children: React.ReactNode;
};

/*
 * Lets the author pick any node of a dev Plugin's Draft page while comment mode is on: a pointer press on a wide
 * window, a long press on a phone. The innermost node under the press opens the editor against it; saving leaves a
 * pin and counts toward Choose. Outside comment mode it draws its children and nothing else (ADR-0057).
 */
export function DraftCommentsLayer(
  props: LayerProps & {
    // The page is a dev Plugin's Draft; any other page draws its children as they are.
    draft: boolean;
  },
): React.ReactNode {
  if (!props.draft) return props.children;

  return <DraftPage {...props} />;
}

function DraftPage(props: LayerProps): React.JSX.Element {
  const { opening, commenting, children } = props;
  const picking = useCommentPicking(opening);
  const { notes } = useDraftComments(opening);
  const { register, picked } = picking;

  const seam = useMemo<DraftCommenting | null>(
    () => (commenting ? { register, Mark } : null),
    [commenting, register],
  );

  const marks = useMemo<Marks>(
    () => ({
      counts: countsOf(notes.map(({ address }) => address)),
      picked: picked?.target.address ?? null,
    }),
    [notes, picked],
  );

  // A part in each slot keeps its state as the window crosses a size class.
  const holder = (press: Press): React.JSX.Element => (
    <PressHolder
      press={press}
      commenting={commenting}
      longPressMilliseconds={props.longPressMilliseconds ?? defaultLongPress}
      onPick={picking.pickAt}
    >
      {children}
      {commenting && picked && (
        <DraftCommentSheet
          open
          anchor={picked.anchor}
          longPressed={press === 'long'}
          title={titleOf({
            nodeKey: picked.target.nodeKey,
            place: picked.target.place,
          })}
          note={picking.note}
          onNoteChange={picking.setNote}
          onSave={picking.save}
          onCancel={picking.close}
        />
      )}
    </PressHolder>
  );

  return (
    <DraftCommentingContext value={seam}>
      <MarksContext value={marks}>
        <SizeClass wide={holder('pointer')} compact={holder('long')} />
      </MarksContext>
    </DraftCommentingContext>
  );
}
