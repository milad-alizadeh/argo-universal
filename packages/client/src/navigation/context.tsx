import { createContext, type ReactNode, useContext } from 'react';

export type NavigationDestination =
  | { to: 'sessions' }
  | { to: 'new-session'; projectId?: string }
  | { to: 'session'; id: string }
  | { to: 'issues' }
  | { to: 'atlas' }
  | { to: 'settings-accounts' }
  | { to: 'settings-project'; name: string }
  | { to: 'settings-connection' }
  | { to: 'settings-agent'; agent: string };

export type Navigate = (destination: NavigationDestination) => void;

const NavigateContext = createContext<Navigate | null>(null);

export interface NavigationProviderProps {
  navigate: Navigate;
  children: ReactNode;
}

export function NavigationProvider({
  navigate,
  children,
}: NavigationProviderProps) {
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
