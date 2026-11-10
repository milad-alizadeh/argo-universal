import { createContext, type ReactNode } from 'react';

// `mark` draws beside a link before any hover, such as a pull request's state; it returns null for links that carry none.
export type LinkPreviewSource = {
  load: (href: string) => Promise<ReactNode>;
  mark?: (href: string) => Promise<ReactNode> | null;
};

// Server access and card content belong to the App; the overlay owns only hover behaviour.
export const LinkPreviewContext = createContext<LinkPreviewSource | null>(null);
