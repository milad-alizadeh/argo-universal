import type { DesktopBridge } from '@repo/contracts';
import {
  type NavigationStreamEvent,
  screenLinkPath,
} from '@repo/contracts/navigation';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useRef } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useOpenScreenLink } from './use-open-screen-link';

declare global {
  interface Window {
    argo?: DesktopBridge;
  }
}

// A browser page, and the web e2e harness, may set a partial `argo`; only the desktop App's preload listens for links.
const isDesktopApp = (
  bridge: DesktopBridge | undefined,
): bridge is DesktopBridge => typeof bridge?.links?.onOpen === 'function';

const desktopBridge = (): DesktopBridge | undefined => {
  const bridge = globalThis.window?.argo;

  return isDesktopApp(bridge) ? bridge : undefined;
};

/*
 * The desktop App opens Screens when asked, from two places that share one path: the Server's `app.open`, through
 * its stream, and a link the system opened in the app, through the desktop bridge. Both focus the window and
 * navigate through the router without a reload.
 */
export function useDesktopNavigation(): void {
  const open = useOpenScreenLink();

  useBridgeLinks(open);
  useServerRequests(open);
}

type Open = ReturnType<typeof useOpenScreenLink>;

type ServerId = { current: string | null };

const showWindow = (): void => desktopBridge()?.window.show();

function useBridgeLinks(open: Open): void {
  useEffect(
    () =>
      desktopBridge()?.links.onOpen((link) => {
        showWindow();
        void open(link);
      }),
    [open],
  );
}

// The Server's `ready` names it; each `open` after it is a destination on that Server.
function receive(
  event: NavigationStreamEvent,
  serverId: ServerId,
  open: Open,
): void {
  if (event.type === 'ready') {
    serverId.current = event.serverId;

    return;
  }

  if (serverId.current === null) return;
  showWindow();
  void open(screenLinkPath(serverId.current, event.destination));
}

function useServerRequests(open: Open): void {
  const trpc = useTRPC();
  const serverId = useRef<string | null>(null);

  const subscription = useSubscription({
    ...trpc.navigation.requests.subscriptionOptions(),
    enabled: desktopBridge() !== undefined,
    onData: (event) => receive(event, serverId, open),
  });

  useResubscribeOnReconnect(subscription);
}
