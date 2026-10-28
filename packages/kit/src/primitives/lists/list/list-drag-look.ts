export interface DragLook {
  // The rows beside the lifted one slide apart where it would land.
  slides: boolean;
  // A line marks where it would land.
  line: boolean;
  // How the lifted row's own slot draws.
  lifted: string;
  // The pointer over a row that moves, and over the List while a row is dragged.
  grab: string;
  grabbing: string;
}

// Desktop and web: the lifted row's slot dims, and a line marks where it lands.
export const dragLook: DragLook = {
  slides: false,
  line: true,
  lifted: 'opacity-40',
  grab: 'cursor-grab **:cursor-grab!',
  grabbing: 'cursor-grabbing **:cursor-grabbing!',
};
