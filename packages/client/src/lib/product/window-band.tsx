import {
  type ClaimStore,
  createClaimStore,
  useClaim,
  useClaimed,
} from '@repo/kit/claim-store';
import {
  createScreenBandHost,
  type ScreenBand,
  ScreenBandHostContext,
  type ScreenBandHost,
} from '@repo/kit/primitives/scaffolds/screen';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { createContext, use, type ReactNode } from 'react';
import { useScreenFocused } from './navigation/navigation';

// The focused page supplies its overview and how its Stage opens; the window owns their placement and pane controls. Its title and menu are its Screen's header, which the kit claims for the band.
export interface WindowBandContent {
  workbench?: ReactNode;
  onStageToggle?: () => void;
}

// What the band draws: the focused Screen's title and menu, and the focused page's overview.
export type WindowBandView = WindowBandContent & Partial<ScreenBand>;

export type WindowBandHost = ClaimStore<WindowBandContent | null>;

export const createWindowBandHost = (): WindowBandHost =>
  createClaimStore<WindowBandContent | null>(null);

export const WindowBandHostContext = createContext<WindowBandHost | undefined>(
  undefined,
);

// Both claims into the band: the page's overview, and the kit's Screen header.
export interface WindowBandHosts {
  content: WindowBandHost;
  screen: ScreenBandHost;
}

export const createWindowBandHosts = (): WindowBandHosts => ({
  content: createWindowBandHost(),
  screen: createScreenBandHost(),
});

export function WindowBandHostsProvider({
  hosts,
  children,
}: {
  hosts: WindowBandHosts;
  children: ReactNode;
}): ReactNode {
  return (
    <WindowBandHostContext value={hosts.content}>
      <ScreenBandHostContext value={hosts.screen}>
        {children}
      </ScreenBandHostContext>
    </WindowBandHostContext>
  );
}

export function useWindowBandView(
  hosts: WindowBandHosts,
): WindowBandView | null {
  const content = useClaimed(hosts.content);
  const screen = useClaimed(hosts.screen);

  return content || screen ? { ...screen, ...content } : null;
}

// A retained page gives up the band's claim while another page is focused. Under wide the page keeps its own native header.
export function WindowBand(content: WindowBandContent): null {
  const host = use(WindowBandHostContext);
  useBandClaim(useWide() ? host : undefined, content);

  return null;
}

function useBandClaim(
  host: WindowBandHost | undefined,
  content: WindowBandContent,
): void {
  const focused = useScreenFocused();
  useClaim(focused ? host : undefined, content);
}
