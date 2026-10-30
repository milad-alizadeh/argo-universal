import { createContext, useContext } from 'react';
import type { IconSizeValue } from '../../../symbols/icon-size';
import type { GlyphLane } from '../../../symbols/row-glyph';

/*
 * What a control says about the icons inside it. A `fixed` size, such as a menu row's leading lane, sizes every icon
 * inside it whatever size the icon names; otherwise it is the size an icon takes when it names none.
 */
export interface IconSizing {
  size: IconSizeValue;
  fixed: boolean;
  /*
   * Set on a row's leading lane, where a glyph keeps the lane's width and each platform draws it at what its own
   * Settings app draws (row-glyph.ts).
   */
  lane?: GlyphLane;
}

export const IconSizeContext = createContext<IconSizing | undefined>(undefined);

// The size of an icon beside body text, which an icon takes where no control sizes it.
const ambientSizing: IconSizing = { size: 'sm', fixed: false };

function useIconSizing(): IconSizing {
  return useContext(IconSizeContext) ?? ambientSizing;
}

export function useIconSize(size: IconSizeValue | undefined): IconSizeValue {
  const sizing = useIconSizing();

  return sizing.fixed ? sizing.size : (size ?? sizing.size);
}

// The lane the control around an icon puts it in, where it has one.
export function useIconLane(): GlyphLane | undefined {
  return useIconSizing().lane;
}
