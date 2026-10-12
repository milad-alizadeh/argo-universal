import type * as React from 'react';
import { createContext, type ReactNode, useContext } from 'react';

// True when this device is paired to a Server on another computer; the App has no pairing yet, so it never names the host.
const ServerPairedContext = createContext(false);

export function ServerPlaceProvider({
  paired,
  children,
}: {
  paired: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ServerPairedContext.Provider value={paired}>
      {children}
    </ServerPairedContext.Provider>
  );
}

export function useServerPaired(): boolean {
  return useContext(ServerPairedContext);
}

// A page caption for settings kept on a paired Server: "On Milad's Mac mini". None on the same computer.
export function useServerCaption(name: string | undefined): string | undefined {
  const paired = useServerPaired();
  return paired && name ? `On ${name}` : undefined;
}
