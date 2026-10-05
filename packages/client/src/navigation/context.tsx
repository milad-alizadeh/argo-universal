import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from 'react';

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
  | { to: 'settings-agent'; agent: string };

export type Navigate = (destination: NavigationDestination) => void;

const NavigateContext = createContext<Navigate | null>(null);
// True while a section picked from the phone drawer mounts, so its drawer starts open and animates shut.
const DrawerHandoverContext = createContext<RefObject<boolean>>({
  current: false,
});

export interface NavigationProviderProps {
  navigate: Navigate;
  children: ReactNode;
}

export function NavigationProvider({
  navigate,
  children,
}: NavigationProviderProps) {
  const drawerHandover = useRef(false);
  return (
    <NavigateContext.Provider value={navigate}>
      <DrawerHandoverContext.Provider value={drawerHandover}>
        {children}
      </DrawerHandoverContext.Provider>
    </NavigateContext.Provider>
  );
}

export function useDrawerHandover(): RefObject<boolean> {
  return useContext(DrawerHandoverContext);
}

export function useNavigate(): Navigate {
  const navigate = useContext(NavigateContext);
  if (!navigate) throw new Error('useNavigate needs NavigationProvider');
  return navigate;
}
