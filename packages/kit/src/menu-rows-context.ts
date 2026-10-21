import { createContext, useContext } from 'react';

// A web popover's rows are menu rows (Paper's Combobox master): flat on the popover, menu-row radius and tints, no grouped card or separators.
export const InMenu = createContext(false);

export const useInMenu = (): boolean => useContext(InMenu);
