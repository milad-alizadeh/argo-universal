import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  LinkPreviewContext,
  type LinkMark,
  type LinkPreviewSource,
  type LiveLinkMarks,
} from './link-preview-context';

// The mark is asked for once the link draws, so it shows without a hover, and again after each hover loads a fresher card.
export function useLinkMark(href: string, card: ReactNode): LinkMark | null {
  const source = useContext(LinkPreviewContext);
  const [mark, setMark] = useState<LinkMark | null>(null);

  useEffect(() => requestMark(source, href, setMark), [source, href, card]);

  return useLiveMark(source?.marks, href) ?? mark;
}

// A mark the App keeps current: the link says it is drawn, and draws whatever the App holds for it now.
function useLiveMark(
  marks: LiveLinkMarks | undefined,
  href: string,
): LinkMark | null | undefined {
  const track = marks?.track;

  useEffect(() => track?.(href), [track, href]);

  return marks?.of.get(href);
}

function requestMark(
  source: LinkPreviewSource | null,
  href: string,
  setMark: (mark: LinkMark) => void,
): (() => void) | undefined {
  const pending = markOf(source, href);

  if (!pending) return undefined;
  const alive = { current: true };

  void pending.then((value) => keepMark(alive, value, setMark)).catch(noMark);

  return (): void => {
    alive.current = false;
  };
}

function markOf(
  source: LinkPreviewSource | null,
  href: string,
): Promise<LinkMark | null> | null {
  const mark = source?.mark;

  return mark ? mark(href) : null;
}

// A refetch that finds nothing (the Server busy, `gh` failing) keeps the last state drawn rather than blanking it.
function keepMark(
  alive: { current: boolean },
  value: LinkMark | null,
  setMark: (mark: LinkMark) => void,
): void {
  if (alive.current && value) setMark(value);
}

function noMark(): void {}
