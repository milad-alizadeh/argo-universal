import { type RefObject, useCallback, useLayoutEffect, useState } from 'react';
import {
  hideFromAssistiveTechnology,
  restoreAssistiveTechnology,
} from './skeleton-aria';
import { measureSkeleton } from './skeleton-dom';
import {
  clearSkeletonMarks,
  markSkeleton,
  overlayAttribute,
  rootAttribute,
} from './skeleton-marks';
import type { SkeletonPlaceholder } from './skeleton-placeholder';
import { ensureSkeletonStyle } from './skeleton-web-style';

type Report = (placeholders: SkeletonPlaceholder[]) => void;

interface Scheduler {
  schedule: () => void;
  cancel: () => void;
}

interface Observers {
  disconnect: () => void;
}

const noop = (): void => undefined;

const measures = (placeholder: SkeletonPlaceholder): number[] => [
  placeholder.left,
  placeholder.top,
  placeholder.width,
  placeholder.height,
  placeholder.radius,
];

const samePlaceholder = (
  a: SkeletonPlaceholder,
  b: SkeletonPlaceholder,
): boolean =>
  measures(a).every((measure, index) => measure === measures(b).at(index));

const samePlaceholders = (
  a: SkeletonPlaceholder[],
  b: SkeletonPlaceholder[],
): boolean =>
  a.length === b.length &&
  a.every((placeholder, index) => {
    const other = b.at(index);

    return other !== undefined && samePlaceholder(placeholder, other);
  });

function clearPage(root: Element): void {
  clearSkeletonMarks(root);
  restoreAssistiveTechnology(root);
}

function refresh(root: Element, report: Report): void {
  clearPage(root);

  const found = measureSkeleton(root);

  markSkeleton(found);
  hideFromAssistiveTechnology(root);
  report(found.placeholders);
}

// The overlay's own nodes change on every draw, so only a change anywhere else asks for a new walk.
const isOutsideOverlay = (record: MutationRecord): boolean => {
  const target = record.target;
  const element = target instanceof Element ? target : target.parentElement;

  return element?.closest(`[${overlayAttribute}]`) == null;
};

function createScheduler(run: () => void): Scheduler {
  let frame = 0;

  return {
    schedule: (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    },
    cancel: (): void => cancelAnimationFrame(frame),
  };
}

function observeChanges(root: Element, schedule: () => void): Observers {
  const resize = new ResizeObserver(schedule);

  const mutation = new MutationObserver((records) => {
    if (records.some(isOutsideOverlay)) schedule();
  });

  const options = { childList: true, subtree: true, characterData: true };

  resize.observe(root);
  mutation.observe(root, options);

  return {
    disconnect: (): void => {
      resize.disconnect();
      mutation.disconnect();
    },
  };
}

function watchSkeleton(root: Element, report: Report): () => void {
  ensureSkeletonStyle();
  root.setAttribute(rootAttribute, '');

  const scheduler = createScheduler(() => refresh(root, report));
  const observers = observeChanges(root, scheduler.schedule);

  refresh(root, report);
  void document.fonts.ready.then(scheduler.schedule);

  return (): void => {
    scheduler.cancel();
    observers.disconnect();
    clearPage(root);
    root.removeAttribute(rootAttribute);
    report([]);
  };
}

function usePlaceholderState(): [SkeletonPlaceholder[], Report] {
  const [placeholders, setPlaceholders] = useState<SkeletonPlaceholder[]>([]);

  const report = useCallback<Report>((next) => {
    setPlaceholders((previous) =>
      samePlaceholders(previous, next) ? previous : next,
    );
  }, []);

  return [placeholders, report];
}

/*
 * The placeholders of a loading Skeleton's content, kept current: measured when loading starts, and again when the
 * wrapper's size changes, the children change or the fonts finish loading. The page's marks are cleared when
 * loading ends or the Skeleton unmounts.
 */
export function useSkeletonPlaceholders(
  ref: RefObject<unknown>,
  loading: boolean,
): SkeletonPlaceholder[] {
  const [placeholders, report] = usePlaceholderState();

  useLayoutEffect(() => {
    const root = ref.current;

    return loading && root instanceof Element
      ? watchSkeleton(root, report)
      : noop;
  }, [loading, ref, report]);

  return placeholders;
}
