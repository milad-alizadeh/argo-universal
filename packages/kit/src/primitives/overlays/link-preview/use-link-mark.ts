import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  LinkPreviewContext,
  type LinkPreviewSource,
} from './link-preview-context';

// The mark is asked for once the link draws, so it shows without a hover, and again after each hover loads a fresher card.
export function useLinkMark(href: string, card: ReactNode): ReactNode {
  const source = useContext(LinkPreviewContext);
  const [mark, setMark] = useState<ReactNode>(null);

  useEffect(() => requestMark(source, href, setMark), [source, href, card]);

  return mark;
}

function requestMark(
  source: LinkPreviewSource | null,
  href: string,
  setMark: (mark: ReactNode) => void,
): (() => void) | undefined {
  const pending = markOf(source, href);

  if (!pending) return undefined;
  const alive = { current: true };

  void pending.then((value) => alive.current && setMark(value)).catch(noMark);

  return (): void => {
    alive.current = false;
  };
}

function markOf(
  source: LinkPreviewSource | null,
  href: string,
): Promise<ReactNode> | null {
  const mark = source?.mark;

  return mark ? mark(href) : null;
}

function noMark(): void {}
