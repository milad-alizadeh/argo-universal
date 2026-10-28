import type { DragLook } from './list-drag-look';

export type { DragLook } from './list-drag-look';

// iOS and Android: the lifted row leaves its slot, and the rows around it slide apart where it would land.
export const dragLook: DragLook = {
  slides: true,
  lifted: 'opacity-0',
  // A finger has no pointer to show.
  grab: '',
  grabbing: '',
};
