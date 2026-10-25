import type { IconName } from '@repo/contracts/kit-symbols';
import type { SheetScreenAction } from './sheet-props';
import type { SheetScreenEntry } from './sheet-screens';

export type TitleRowProps = Pick<SheetScreenEntry, 'title' | 'action'> & {
  // A pushed page's way back to the page below it.
  backLabel?: string;
  onBack: () => void;
  /*
   * The sheet's own way out, which only the root page carries: there is nothing below it to go back to, and
   * the leading end of its title row would otherwise stand empty (owner, 2026-10-21).
   */
  onClose?: () => void;
};

// The header's icon buttons have no danger tone, so a destructive action keeps its red label.
export const drawnAsIcon = (
  action: SheetScreenAction,
): action is SheetScreenAction & { icon: IconName } =>
  action.icon !== undefined && !action.destructive;
