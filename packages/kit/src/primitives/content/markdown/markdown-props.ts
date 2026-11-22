import type { ReactElement } from 'react';
import type { KitProps } from '../../kit-props';

export type MarkdownFence = {
  language?: string;
  raw: string;
  fallback: ReactElement;
};

export type MarkdownFenceRenderer = (
  fence: MarkdownFence,
) => ReactElement | null;

export type MarkdownProps = KitProps<'Markdown'> & {
  tone?: 'muted';
  /** Draw a fence inline or return null to keep its source. */
  renderFence?: MarkdownFenceRenderer;
  /** Lets a person select and copy the text on every platform; web already does. */
  selectable?: boolean;
  /** Clamp at a whole line or block within this many body lines. */
  numberOfLines?: number;
  onOverflowChange?: (overflowing: boolean) => void;
};
