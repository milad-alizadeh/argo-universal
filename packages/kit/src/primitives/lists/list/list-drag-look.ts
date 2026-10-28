export interface DragLook {
  // The rows beside the lifted one slide apart where it would land.
  slides: boolean;
  // A line marks where it would land.
  line: boolean;
  // How the lifted row's own slot draws.
  lifted: string;
}

// Desktop and web: the lifted row's slot dims, and a line marks where it lands.
export const dragLook: DragLook = {
  slides: false,
  line: true,
  lifted: 'opacity-40',
};
