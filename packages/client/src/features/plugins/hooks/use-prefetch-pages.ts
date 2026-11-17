import { useEffect } from 'react';
import type { PageOpening } from '../utils/page-keys';
import { navRootOpening } from '../utils/plugin-page-route';
import { usePageAddresses } from './use-page-addresses';
import { usePluginSections } from './use-plugin-sections';

/*
 * Draws each nav item's root page once the Server's Plugin list arrives, and keeps the trees, so the first tap on
 * a rail item shows a tree at once and draws again behind it. It runs under the frame, so it covers every item
 * whichever Section is shown.
 */
export function usePrefetchNavPages(): void {
  const addresses = usePageAddresses();
  const sections = usePluginSections();

  // A page already kept is left as it is, so the list drawing again costs no draw.
  useEffect(() => {
    for (const section of sections)
      void addresses.prefetch(navRootOpening(section));
  }, [addresses, sections]);
}

/*
 * Starts the draw of the page a route names without waiting for the Server's Plugin list: the route holds the
 * Plugin id and the page's path, and the list is only needed for the title and the rail. The page that mounts
 * once the list arrives finds the draw already in flight.
 */
export function usePrefetchRoutePage(opening: PageOpening): void {
  const addresses = usePageAddresses();
  const { pluginId, path, projectId, sessionId } = opening;

  useEffect(() => {
    void addresses.prefetch({ pluginId, path, projectId, sessionId });
  }, [addresses, pluginId, path, projectId, sessionId]);
}
