import { createContext, useContext } from 'react';

/*
 * How a desktop or web List draws its rows, where Paper draws them apart from the kit's grouped card:
 * - sidebar: Paper's SettingsList, flat on the glass, rounded selected and hover tints, no card, separators or chevrons;
 * - content: Paper's List / Grouped on a page, a 24-radius card with no edge, rows 20 in and border separators.
 */
export type RowDrawing = 'kit' | 'sidebar' | 'content';

export const RowDrawingContext = createContext<RowDrawing>('kit');

export const useRowDrawing = (): RowDrawing => useContext(RowDrawingContext);

export const useInSidebar = (): boolean => useRowDrawing() === 'sidebar';
