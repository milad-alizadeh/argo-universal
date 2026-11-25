import { SizeClass } from '@repo/kit/size-class/size-class';
import { createContext, useContext, useMemo, useRef } from 'react';
import type * as React from 'react';
import { Platform, type View } from 'react-native';
import {
  DraftCommentingContext,
  type Box,
  type DraftCommenting,
  type DraftPlace,
} from '../../../../lib/product/plugin-registry/draft-commenting';
import {
  useCommentPicking,
  type CommentPicking,
} from '../../hooks/use-comment-picking';
import { useMeasuredBox } from '../../hooks/use-measured-box';
import { useDraftComments, type DraftNote } from '../../stores/draft-comments';
import { keyOf, titleOf } from '../../utils/draft-comment-hit';
import { pinKey, pinKeyOf } from '../../utils/draft-pin-key';
import type { PageOpening } from '../../utils/page-addresses';
import { DraftCommentMark } from './draft-comment-mark';
import { DraftCommentSheet } from './draft-comment-sheet';
import { PressHolder, type Press } from './press-holder';

const defaultLongPress = 450;

type Marks = { pinNumbers: ReadonlyMap<string, number>; picked: string | null };

const MarksContext = createContext<Marks>({
  pinNumbers: new Map(),
  picked: null,
});

function Mark({
  address,
  focused,
  place,
  measure,
}: {
  address: string;
  focused: boolean;
  place: DraftPlace | null;
  measure: (done: (box: Box) => void) => void;
}): React.JSX.Element {
  const { pinNumbers, picked } = useContext(MarksContext);
  const pinNumber = pinNumbers.get(pinKey(address, place));
  const selected = picked === address || focused;

  const box = useMeasuredBox(
    measure,
    Platform.OS === 'web' && (selected || pinNumber !== undefined),
  );

  return (
    <DraftCommentMark
      pinNumber={pinNumber}
      selected={selected}
      box={Platform.OS === 'web' ? box : undefined}
    />
  );
}

function pinNumbersOf(
  notes: readonly DraftNote[],
): ReadonlyMap<string, number> {
  return new Map(notes.map((note, index) => [pinKeyOf(note), index + 1]));
}

type LayerProps = {
  opening: PageOpening;
  commenting: boolean;
  showSavedPins?: boolean;
  // How long a phone's press is before it picks; a test shortens it.
  longPressMilliseconds?: number;
  children: React.ReactNode;
};

export function DraftCommentsLayer(
  props: LayerProps & {
    draft: boolean;
  },
): React.ReactNode {
  if (!props.draft) return props.children;

  return <DraftPage {...props} />;
}

function DraftPage(props: LayerProps): React.JSX.Element {
  const { opening, commenting, showSavedPins, children } = props;
  const picking = useCommentPicking(opening);
  const { notes } = useDraftComments(opening);
  const { picked } = picking;
  const holderRef = useRef<React.ComponentRef<typeof View>>(null);

  const seam = useDraftCommenting(
    { commenting, showSavedPins: showSavedPins === true },
    holderRef,
    picking,
  );

  const marks = useMemo<Marks>(
    () => ({
      pinNumbers: pinNumbersOf(notes),
      picked: picked?.target.address ?? null,
    }),
    [notes, picked],
  );

  // A part in each slot keeps its state as the window crosses a size class.
  const holder = (press: Press): React.JSX.Element => (
    <PressHolder
      holder={holderRef}
      press={press}
      commenting={commenting}
      longPressMilliseconds={props.longPressMilliseconds ?? defaultLongPress}
      onPick={picking.pickAt}
      onPickAddress={picking.pickAddress}
    >
      {children}
      {commenting && <CommentEditor picking={picking} press={press} />}
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

function useDraftCommenting(
  {
    commenting,
    showSavedPins,
  }: { commenting: boolean; showSavedPins: boolean },
  holderRef: React.RefObject<React.ComponentRef<typeof View> | null>,
  { register, pickAddress }: CommentPicking,
): DraftCommenting | null {
  return useMemo<DraftCommenting | null>(
    () =>
      commenting || showSavedPins
        ? {
            active: commenting,
            register,
            Mark,
            pickOutside: (element, address, schedule): boolean => {
              const holder = holderRef.current;

              if (!(holder instanceof Element) || holder.contains(element))
                return false;

              pickAddress(holder, address, schedule);

              return true;
            },
          }
        : null,
    [commenting, showSavedPins, holderRef, register, pickAddress],
  );
}

function CommentEditor({
  picking,
  press,
}: {
  picking: CommentPicking;
  press: Press;
}): React.JSX.Element | null {
  const { picked } = picking;

  if (!picked) return null;

  return (
    <DraftCommentSheet
      open
      anchor={picked.anchor}
      longPressed={press === 'long'}
      title={titleOf({
        place: picked.target.place,
        text: picked.target.text(),
      })}
      nodeName={keyOf(picked.target)}
      note={picking.note}
      onNoteChange={picking.setNote}
      onSave={picking.save}
      onCancel={picking.close}
    />
  );
}
