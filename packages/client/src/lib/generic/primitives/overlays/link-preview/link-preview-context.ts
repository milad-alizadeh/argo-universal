import { createContext, type ReactNode } from 'react';

export type LinkPreviewSource = { load: (href: string) => Promise<ReactNode> };

// Server access and card content belong to the App; the overlay owns only hover behaviour.
export const LinkPreviewContext = createContext<LinkPreviewSource | null>(null);
