import { createContext, useContext } from 'react';
import type { IconSizeValue } from '../../../symbols/icon-size';

// A slot that sizes every icon inside it, such as a menu row's leading lane, whatever size the icon names.
export const IconSizeContext = createContext<IconSizeValue | undefined>(
  undefined,
);

export function useSlotIconSize(size: IconSizeValue): IconSizeValue {
  return useContext(IconSizeContext) ?? size;
}
