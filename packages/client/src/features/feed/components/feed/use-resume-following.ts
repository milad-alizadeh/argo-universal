import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useLayoutEffect, useRef } from 'react';

type FollowList = Pick<LegendListRef, 'getState'>;

const stillFollowing = (list: FollowList): boolean => {
  const { isAtEnd, isFollowingEnd } = list.getState();

  return isAtEnd && isFollowingEnd;
};

interface Follow {
  current: FollowList;
  followedEnd: RefObject<boolean>;
  open: (anchor: null) => void;
}

function resumeWhenShown({ current, followedEnd, open }: Follow): () => void {
  let pending = followedEnd.current;

  const frame = pending
    ? requestAnimationFrame(() => {
        pending = false;

        if (!stillFollowing(current)) open(null);
      })
    : 0;

  return (): void => {
    if (pending) return cancelAnimationFrame(frame);

    const { isAtEnd, isFollowingEnd } = current.getState();
    followedEnd.current = isAtEnd || isFollowingEnd;
  };
}

// Capture follow intent before hidden updates move the end of a retained Feed.
export function useResumeFollowing(
  list: RefObject<FollowList | null>,
  shown: boolean,
  open: (anchor: null) => void,
): void {
  const followedEnd = useRef(false);

  useLayoutEffect(() => {
    const current = list.current;

    return shown && current
      ? resumeWhenShown({ current, followedEnd, open })
      : undefined;
  }, [list, shown, open]);
}
