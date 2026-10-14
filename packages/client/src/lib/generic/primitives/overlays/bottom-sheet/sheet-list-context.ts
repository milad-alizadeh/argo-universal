import { createContext, useContext } from 'react';

// How tall a native list in a sheet is drawn, and how tall its rows are.
type SheetListGeometry = {
  containerHeight: number;
  contentHeight: number;
};

export type SheetList = {
  // A sheet that rises to its list's height hears the list's geometry.
  onGeometry?: (geometry: SheetListGeometry) => void;
};

const SheetListContext = createContext<SheetList | undefined>(undefined);

export const SheetListProvider = SheetListContext.Provider;

// The phone sheet a native list sits in, if any: the list then lets the sheet's surface show.
export function useSheetList(): SheetList | undefined {
  return useContext(SheetListContext);
}
