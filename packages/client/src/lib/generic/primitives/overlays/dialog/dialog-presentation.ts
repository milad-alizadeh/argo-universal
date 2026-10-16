import { useWide } from '../../../use-wide/use-wide';
import { useDialogState } from './dialog-context';
import type { DialogPresentation } from './dialog-props';

export function useDialogPresentation(): DialogPresentation {
  return { wide: useWide(), sheetOpen: useDialogState().open };
}
