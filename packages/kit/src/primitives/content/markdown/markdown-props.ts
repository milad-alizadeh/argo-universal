import type { KitProps } from '../../kit-props';

export type MarkdownProps = KitProps<'Markdown'> & {
  tone?: 'muted';
  /** Lets a person select and copy the text on every platform; web already does. */
  selectable?: boolean;
  /** Clamp at a whole line or block within this many body lines. */
  numberOfLines?: number;
  onOverflowChange?: (overflowing: boolean) => void;
};
