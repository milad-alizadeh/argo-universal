import { createContext } from 'react';

export const MarkdownTone = createContext<'muted' | undefined>(undefined);

export const MarkdownSelectable = createContext(false);
