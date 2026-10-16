import { createOpenStateContext } from '#primitives/overlays/open-state';

export const [DialogContext, useDialogState] = createOpenStateContext('Dialog');
