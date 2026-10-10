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

export interface NavigateOptions {
  // Swaps out the current page, so Back skips it.
  replace?: boolean;
}

export type Navigate = (
  destination: NavigationDestination,
  options?: NavigateOptions,
) => void;

const NavigateContext = createContext<Navigate | null>(null);

export interface NavigationProviderProps {
  navigate: Navigate;
  children: ReactNode;
}

export function NavigationProvider({
  navigate,
  children,
}: NavigationProviderProps): React.JSX.Element {
  return (
    <NavigateContext.Provider value={navigate}>
      {children}
    </NavigateContext.Provider>
  );
}

export function useNavigate(): Navigate {
  const navigate = useContext(NavigateContext);
  if (!navigate) throw new Error('useNavigate needs NavigationProvider');
  return navigate;
}
