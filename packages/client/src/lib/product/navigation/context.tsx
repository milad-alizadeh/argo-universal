import type * as React from 'react';
import { createContext, type ReactNode, useContext } from 'react';

export type NavigationDestination =
  | { to: 'sessions' }
  | { to: 'new-session'; projectId?: string }
  | { to: 'session'; id: string }
  | { to: 'issues' }
  | { to: 'atlas' }
  | { to: 'settings' }
  | { to: 'settings-projects' }
  | { to: 'settings-agents' }
  | { to: 'settings-devices' }
  | { to: 'settings-appearance' }
  | { to: 'settings-notifications' }
  | { to: 'settings-accounts' }
  | { to: 'settings-project'; name: string }
  | { to: 'settings-connection' }
  | { to: 'settings-agent-new' }
  | { to: 'settings-agent'; agent: string };

interface NavigateOptions {
  // Swaps out the current page, so Back skips it.
  replace?: boolean;
  // The shown page becomes the destination by changing its params: the same screen, no new page and no animation.
  inPlace?: boolean;
}

export type Navigate = (
  destination: NavigationDestination,
  options?: NavigateOptions,
) => void;

/*
 * Asks to be told when the person tries to leave the page: a back swipe, Back, or a link.
 * While `active`, leaving waits for onBlocked, which calls `proceed` to let it go.
 */
export type LeaveGuard = (
  active: boolean,
  onBlocked: (proceed: () => void) => void,
) => void;

const noLeaveGuard: LeaveGuard = () => null;

const NavigateContext = createContext<Navigate | null>(null);

const LeaveGuardContext = createContext<LeaveGuard>(noLeaveGuard);

export interface NavigationProviderProps {
  navigate: Navigate;
  // A hook the app implements with its router; without one, nothing holds a page.
  leaveGuard?: LeaveGuard;
  children: ReactNode;
}

export function NavigationProvider({
  navigate,
  leaveGuard = noLeaveGuard,
  children,
}: NavigationProviderProps): React.JSX.Element {
  return (
    <NavigateContext.Provider value={navigate}>
      <LeaveGuardContext.Provider value={leaveGuard}>
        {children}
      </LeaveGuardContext.Provider>
    </NavigateContext.Provider>
  );
}

export function useNavigate(): Navigate {
  const navigate = useContext(NavigateContext);

  if (!navigate) throw new Error('useNavigate needs NavigationProvider');

  return navigate;
}

export function useLeaveGuard(
  active: boolean,
  onBlocked: (proceed: () => void) => void,
): void {
  useContext(LeaveGuardContext)(active, onBlocked);
}
