import { iconSymbols } from '../../../symbols/icon-names';
import type { RowTextProps } from './field-row-text';

type Leading = NonNullable<RowTextProps['leading']>;

/*
 * A row's leading icon, drawn by `draw`, or the plug a Plugin's icon falls back to when `draw` has nothing. A
 * Plugin names its own Material symbol and Argo bundles only the drawings of its own icons, so a Plugin's name
 * often has none on Android; the row then keeps its leading lane filled and a list's titles share one x. A row
 * with no leading icon draws none.
 */
export function withPlugFallback<Drawing>(
  leading: RowTextProps['leading'],
  draw: (icon: Leading) => Drawing | undefined,
): Drawing | undefined {
  if (!leading) return undefined;

  return draw(leading) ?? draw(iconSymbols.plug);
}
