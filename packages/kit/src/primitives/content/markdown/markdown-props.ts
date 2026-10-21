import type { KitProps } from '../../kit-props';

export type MarkdownProps = KitProps<'Markdown'> & {
  tone?: 'muted';
  /** Clamp at a whole line or block within this many body lines. */
  numberOfLines?: number;
  onOverflowChange?: (overflowing: boolean) => void;
};
