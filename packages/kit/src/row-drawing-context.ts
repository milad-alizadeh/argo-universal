import { createContext, useContext } from 'react';

/*
 * How a desktop or web List draws its rows, where Paper draws them apart from the kit's own:
 * - sidebar: Paper's SettingsList, flat on the glass, rounded selected and hover tints, no card, separators or chevrons.
 */
export type RowDrawing = 'kit' | 'sidebar';

export const RowDrawingContext = createContext<RowDrawing>('kit');

export const useRowDrawing = (): RowDrawing => useContext(RowDrawingContext);

export const useInSidebar = (): boolean => useRowDrawing() === 'sidebar';
