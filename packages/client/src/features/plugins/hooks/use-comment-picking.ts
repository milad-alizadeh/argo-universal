import { useCallback, useRef, useState } from 'react';
import type * as React from 'react';
import type { View } from 'react-native';
import {
  boxOf,
  type Box,
  type CommentTarget,
} from '../../../lib/product/plugin-registry/draft-commenting';
import type { Anchor } from '../components/draft-comment/draft-comment-sheet';
import { draftComments, useDraftComments } from '../stores/draft-comments';
import { innermostAt, type Placed } from '../utils/draft-comment-hit';
import type { PageOpening } from '../utils/page-addresses';

type Holder = React.ComponentRef<typeof View>;

export type Picked = { target: CommentTarget; anchor: Anchor };

function measured(
  targets: readonly CommentTarget[],
  holder: Holder,
  done: (boxes: Placed[], origin: Box) => void,
): void {
  holder.measureInWindow((...rect) => {
    const origin = boxOf(rect);
    const boxes: Placed[] = [];

    if (targets.length === 0) return done(boxes, origin);

    for (const target of targets)
      target.measure((box) => {
        boxes.push({ address: target.address, ...box });

        if (boxes.length === targets.length) done(boxes, origin);
      });
  });
}

export interface CommentPicking {
  picked: Picked | null;
  note: string;
  setNote: (note: string) => void;
  register: (target: CommentTarget) => () => void;
  pickAt: (holder: Holder, point: { x: number; y: number }) => void;
  save: () => void;
  close: () => void;
}

export function useCommentPicking(opening: PageOpening): CommentPicking {
  const { notes } = useDraftComments(opening);
  const targets = useRef(new Map<string, CommentTarget>());
  const [picked, setPicked] = useState<Picked | null>(null);
  const [note, setNote] = useState('');

  const register = useCallback((target: CommentTarget) => {
    targets.current.set(target.address, target);

    return (): void => {
      targets.current.delete(target.address);
    };
  }, []);

  const open = (target: CommentTarget, anchor: Anchor): void => {
    setNote(notes.find((left) => left.address === target.address)?.note ?? '');
    setPicked({ target, anchor });
  };

  const pickAt = (holder: Holder, point: { x: number; y: number }): void => {
    measured([...targets.current.values()], holder, (boxes, origin) => {
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

  return { picked, note, setNote, register, pickAt, save, close };
}
