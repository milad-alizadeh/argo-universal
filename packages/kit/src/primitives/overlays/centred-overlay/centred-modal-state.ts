import { createOpenStateContext } from '#primitives/overlays/open-state';

export const [CentredModalContext, useCentredModalState] =
  createOpenStateContext('CentredModal');
