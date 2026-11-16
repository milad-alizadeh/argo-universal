import { createContext, type ReactNode } from 'react';
import type { StageMark } from '#kit/stage-marks';

// What a link is marked with: the icon drawn before it, in the tone its label takes too, as the Session row draws a Change.
export type LinkMark = Pick<StageMark, 'icon' | 'tone'>;

// Marks the App keeps current: a link says it is drawn, and its mark is whatever the App holds for it now.
export type LiveLinkMarks = {
  of: ReadonlyMap<string, LinkMark | null>;
  track: (href: string) => void;
};

/*
 * `mark` draws beside a link before any hover, such as a pull request's state; it returns null for links that carry
 * none. `marks` does the same for marks that change while the link is on screen, and is drawn ahead of `mark`.
 */
export type LinkPreviewSource = {
  load: (href: string) => Promise<ReactNode>;
  mark?: (href: string) => Promise<LinkMark | null> | null;
  marks?: LiveLinkMarks;
};

// Server access and card content belong to the App; the overlay owns only hover behaviour.
export const LinkPreviewContext = createContext<LinkPreviewSource | null>(null);

// The tone of the mark before a link, so its label takes the same tone; null for an unmarked link.
export const LinkToneContext = createContext<LinkMark['tone'] | null>(null);
