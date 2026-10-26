import { useState } from 'react';
import type { ScaffoldProps } from './scaffold-props';

export interface SidebarIntent {
  sidebarRequested: boolean;
  requestSidebar: (shown: boolean) => void;
}

export function useSidebarIntent(scaffold: ScaffoldProps): SidebarIntent {
  const [sidebarRequested, request] = useState(false);

  const requestSidebar = (shown: boolean): void => {
    request(shown);
    scaffold.onSidebarShownChange(shown);
  };

  return { sidebarRequested, requestSidebar };
}
