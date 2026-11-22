import { createContext } from 'react';
import type { MarkdownFenceRenderer } from './markdown-props';

export const MarkdownTone = createContext<'muted' | undefined>(undefined);

export const MarkdownSelectable = createContext(false);

export const MarkdownFenceRendering = createContext<
  MarkdownFenceRenderer | undefined
>(undefined);
