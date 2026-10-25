import { createContext, useContext } from 'react';
import type { IconSizeValue } from '../../../symbols/icon-size';

/*
 * What a control says about the icons inside it. A `fixed` size, such as a menu row's leading lane, sizes every icon
 * inside it whatever size the icon names; otherwise it is the size an icon takes when it names none.
 */
export interface IconSizing {
  size: IconSizeValue;
  fixed: boolean;
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
