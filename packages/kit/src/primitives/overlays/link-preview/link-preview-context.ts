import { createContext, type ReactNode } from 'react';

// Marks the App keeps current: a link says it is drawn, and its mark is whatever the App holds for it now.
export type LiveLinkMarks = {
  of: ReadonlyMap<string, ReactNode>;
  track: (href: string) => void;
};

/*
 * `mark` draws beside a link before any hover, such as a pull request's state; it returns null for links that carry
 * none. `marks` does the same for marks that change while the link is on screen, and is drawn ahead of `mark`.
 */
export type LinkPreviewSource = {
  load: (href: string) => Promise<ReactNode>;
  mark?: (href: string) => Promise<ReactNode> | null;
  marks?: LiveLinkMarks;
};

// Server access and card content belong to the App; the overlay owns only hover behaviour.
export const LinkPreviewContext = createContext<LinkPreviewSource | null>(null);
