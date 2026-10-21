import { createContext, useContext } from 'react';
import type { IconRoleValue } from '../../../symbols/icon-role';

// A slot that sizes every icon inside it, such as a menu row's leading lane, whatever role the icon names.
export const IconRoleContext = createContext<IconRoleValue | undefined>(
  undefined,
);

export function useSlotIconRole(role: IconRoleValue): IconRoleValue {
  return useContext(IconRoleContext) ?? role;
}
