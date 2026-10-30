import { sheetDefaults } from '@repo/contracts/kit-tokens';

// Whether a Sheet's system gestures may dismiss it: it takes them unless the Plugin says no.
export const isDismissible = (dismissible: boolean | undefined): boolean =>
  dismissible ?? sheetDefaults.dismissible;
