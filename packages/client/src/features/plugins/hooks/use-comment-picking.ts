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

type Picked = { target: CommentTarget; anchor: Anchor };

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
        boxes.push({ address: target.address, hit: target.hit, ...box });

        if (boxes.length === targets.length) done(boxes, origin);
      });
  });
}

type OpenComment = (target: CommentTarget, anchor: Anchor) => void;

function pickAddressOf(
  holder: Holder,
  target: CommentTarget | undefined,
  open: OpenComment,
): void {
  if (!target) return;

  holder.measureInWindow((x, y) => {
    target.measure((box) => {
      if (box.width > 0 && box.height > 0)
        open(target, { ...box, x: box.x - x, y: box.y - y });
    });
  });
}

export interface CommentPicking {
  picked: Picked | null;
  note: string;
  setNote: (note: string) => void;
  register: (target: CommentTarget) => () => void;
  pickAt: (holder: Holder, point: { x: number; y: number }) => void;
  pickAddress: (holder: Holder, address: string) => void;
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

    return targets.current.delete.bind(targets.current, target.address);
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

  const save = (): void => {
    if (!picked) return;

    const { address, nodeKey, place } = picked.target;

    draftComments.save(opening, {
      address,
      nodeKey,
      note,
      ...(place && { region: place.region, variant: place.variant }),
    });
    setPicked(null);
  };

  return {
    picked,
    note,
    setNote,
    register,
    pickAt,
    pickAddress: (holder, address): void =>
      pickAddressOf(holder, targets.current.get(address), open),
    save,
    close: (): void => setPicked(null),
  };
}
