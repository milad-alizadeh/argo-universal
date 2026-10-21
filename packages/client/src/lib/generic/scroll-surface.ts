import { createContext, useContext } from 'react';

/*
 * How much clear space the surface around a scroller needs below its last row, in px. A sheet holds its
 * last row off the home indicator this way rather than by padding itself: padding the surface leaves a
 * dead band the content stops short of, while a gap at the end of the scrolled content lets the page fill
 * the sheet to its edge and run under the bar until it is scrolled home (owner, 2026-10-20).
 */
export const ScrollEndGapContext = createContext(0);

export const useScrollEndGap = (): number => useContext(ScrollEndGapContext);
