import { useWide } from '@repo/kit/use-wide/use-wide';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type * as React from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import {
  DraftCommentingContext,
  type CommentTarget,
  type DraftCommenting,
} from '../../../../lib/product/plugin-registry/draft-commenting';
import { draftComments, useDraftComments } from '../../stores/draft-comments';
import { innermostAt, titleOf, type Box } from '../../utils/draft-comment-hit';
import type { PageOpening } from '../../utils/page-addresses';
import { DraftCommentMark } from './draft-comment-mark';
import { DraftCommentSheet, type Anchor } from './draft-comment-sheet';

// A press shorter than this is a tap; a phone picks a node only by pressing longer.
const defaultLongPress = 450;

type Picked = { target: CommentTarget; anchor: Anchor };

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

/*
 * Lets the author pick any node of a dev Plugin's Draft page while comment mode is on: a pointer press on a wide
 * window, a long press on a phone. The innermost node under the press opens the editor against it; saving leaves a
 * pin and counts toward Choose. Outside comment mode it draws its children and nothing else (ADR-0057).
 */
export function DraftCommentsLayer(props: {
  opening: PageOpening;
  // The page is a dev Plugin's Draft; any other page draws its children as they are.
  draft: boolean;
  commenting: boolean;
  // How long a phone's press is before it picks; a test shortens it.
  longPressMilliseconds?: number;
  children: React.ReactNode;
}): React.ReactNode {
  if (!props.draft) return props.children;

  return <DraftPage {...props} />;
}

function DraftPage(props: {
  opening: PageOpening;
  commenting: boolean;
  longPressMilliseconds?: number;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    opening,
    commenting,
    longPressMilliseconds = defaultLongPress,
    children,
  } = props;
  const { notes } = useDraftComments(opening);
  const wide = useWide();
  const targets = useRef(new Map<string, CommentTarget>());
  const holder = useRef<React.ComponentRef<typeof View>>(null);
  const pressedAt = useRef(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [note, setNote] = useState('');

  const register = useCallback((target: CommentTarget) => {
    targets.current.set(target.address, target);

    return () => {
      targets.current.delete(target.address);
    };
  }, []);

  const open = (target: CommentTarget, anchor: Anchor): void => {
    setNote(
      notes.find(({ address }) => address === target.address)?.note ?? '',
    );
    setPicked({ target, anchor });
  };

  const pick = (point: { x: number; y: number }): void => {
    measured([...targets.current.values()], holder.current, (boxes, origin) => {
      const hit = innermostAt(boxes, point);
      const target = hit && targets.current.get(hit.address);

      if (hit && target)
        open(target, {
          x: hit.x - origin.x,
          y: hit.y - origin.y,
          width: hit.width,
          height: hit.height,
        });
    });
  };

  const release = (event: GestureResponderEvent): void => {
    const { pageX, pageY, timestamp } = event.nativeEvent;
    const long = timestamp - pressedAt.current >= longPressMilliseconds;

    // A pointer picks on any press, a phone only on a long one.
    if (wide || long) pick({ x: pageX, y: pageY });
  };

  const close = (): void => setPicked(null);

  const save = (): void => {
    if (!picked) return;

    const { address, nodeKey, place } = picked.target;

    draftComments.save(opening, {
      address,
      nodeKey,
      note,
      ...(place && { region: place.region, variant: place.variant }),
    });
    close();
  };

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

  return (
    <DraftCommentingContext value={seam}>
      <MarksContext value={marks}>
        <View
          ref={holder}
          className="min-h-0 flex-1"
          onStartShouldSetResponderCapture={() => commenting}
          onResponderGrant={(event) => {
            pressedAt.current = event.nativeEvent.timestamp;
          }}
          onResponderRelease={release}
        >
          {children}
          {commenting && picked && (
            <DraftCommentSheet
              open
              anchor={picked.anchor}
              title={titleOf({
                nodeKey: picked.target.nodeKey,
                place: picked.target.place,
              })}
              note={note}
              onNoteChange={setNote}
              onSave={save}
              onCancel={close}
            />
          )}
        </View>
      </MarksContext>
    </DraftCommentingContext>
  );
}

function countsOf(addresses: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const address of addresses)
    counts.set(address, (counts.get(address) ?? 0) + 1);

  return counts;
}

// Every picked node's box in the window, with the holder's own origin, so a box can be placed inside the holder.
function measured(
  targets: readonly CommentTarget[],
  holder: React.ComponentRef<typeof View> | null,
  done: (boxes: Box[], origin: { x: number; y: number }) => void,
): void {
  if (!holder) return;

  holder.measureInWindow((x, y) => {
    const boxes: Box[] = [];
    let waiting = targets.length;

    if (waiting === 0) return done(boxes, { x, y });

    for (const target of targets)
      target.measure((left, top, width, height) => {
        boxes.push({ address: target.address, x: left, y: top, width, height });
        waiting -= 1;

        if (waiting === 0) done(boxes, { x, y });
      });
  });
}
