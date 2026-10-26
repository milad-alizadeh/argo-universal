import { useState } from 'react';
import {
  type ContentRule,
  placedContentWide,
} from '../../../lib/product/content-rule';
import { useContentRule } from '../../../lib/product/use-content-rule';
import type { ScaffoldParts } from './scaffold-frame';

// The width the Frame placed, drawn wide or not; a hidden page keeps what it drew last.
function useHeldWide(width: number, rule: ContentRule): boolean | undefined {
  const [held, setHeld] = useState<boolean>();
  const wide = placedContentWide(width, rule, held);

  if (wide !== held) setHeld(wide);

  return wide;
}

/*
 * Whether the page's content draws wide, from the content column the Frame placed. Without a Frame it is
 * undefined, and the content follows the window's width, as a compact or medium window's does.
 */
export function usePageContentWide(parts: ScaffoldParts): boolean | undefined {
  const wide = useHeldWide(parts.layout.content.width, useContentRule());

  return parts.framed ? wide : undefined;
}
