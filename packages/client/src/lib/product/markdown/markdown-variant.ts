import { createContext } from 'react';

export type MarkdownVariantName = 'feed' | 'proposal' | 'summary';

export const MarkdownVariant = createContext<MarkdownVariantName>('feed');
