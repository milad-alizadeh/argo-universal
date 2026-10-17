import { createContext } from 'react';

export type MarkdownVariantName = 'feed' | 'plan' | 'summary';

export const MarkdownVariant = createContext<MarkdownVariantName>('feed');
