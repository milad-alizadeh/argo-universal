import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { closeSessionPanel } from '#features/sessions';
import { PluginTree } from '../../../lib/product/plugin-registry';
import { useOpenPluginPage } from '../../plugins/use-plugin-opener';
import { usePluginView } from '../../plugins/use-plugin-view';
import type { HeldCardStore, HeldCardView } from './held-card-store';

// One declared card's page, watched for a Session whether or not its card is drawn.
export interface HeldCard {
  cardKey: string;
  pluginId: string;
  path: string;
}

interface Holding {
  store: HeldCardStore;
  sessionId: string;
}

/*
 * Opens the view of every card's page for the Session and keeps each in the store, so Argo knows which cards have
 * something to show before it draws any: a card whose page draws nothing is not drawn (ADR-0035).
 */
export function HeldCardViews({
  cards,
  ...holding
}: Holding & { cards: readonly HeldCard[] }): ReactNode {
  return cards.map((card) => (
    <HeldView
      key={`${holding.sessionId}/${card.cardKey}`}
      {...holding}
      card={card}
    />
  ));
}

function HeldView({
  store,
  sessionId,
  card: { cardKey, pluginId, path },
}: Holding & { card: HeldCard }): null {
  useHoldView(
    { store, sessionId, cardKey },
    usePluginView({ pluginId, path, sessionId }),
  );

  return null;
}

// The value from the latest render, for a callback the store keeps past the render it was made in.
function useCurrent<Value>(value: Value): { current: Value } {
  const current = useRef(value);

  useEffect(() => {
    current.current = value;
  });

  return current;
}

/*
 * Keeps one card's view in the store while it lasts. A card that empties closes its Inspector tab, or its sheet on a
 * phone, so neither comes back unasked when it fills again; one still waiting for its Plugin keeps its tab.
 */
function useHoldView(
  { store, sessionId, cardKey }: Holding & { cardKey: string },
  { root, treeKey, dispatch }: HeldCardView,
): void {
  // The view's dispatch changes every render, so the held one calls the current.
  const latest = useCurrent(dispatch);

  useEffect(() => {
    const emptied = store.hold(cardKey, {
      root,
      treeKey,
      dispatch: (...event) => latest.current(...event),
    });

    if (emptied) closeSessionPanel(sessionId, cardKey);
  }, [store, sessionId, cardKey, root, treeKey, latest]);

  useEffect(() => (): void => store.release(cardKey), [store, cardKey]);
}

// A card's page, drawn from the view the Session holds for it; nothing until that view has a tree.
export function HeldCardPage({
  store,
  cardKey,
  pluginId,
}: Omit<HeldCard, 'path'> & { store: HeldCardStore }): ReactNode {
  const view = useSyncExternalStore(store.subscribe, () => store.view(cardKey));

  return <DrawnPluginPage view={view} pluginId={pluginId} />;
}

/*
 * A card's full view, watched for the Session while its Inspector tab or sheet is open, as the Plugin's own pages are.
 * The tab's frame is Argo's and draws at once; the page fills it when the Plugin answers (ADR-0025 lazy start).
 */
export function PluginTabPage({
  pluginId,
  path,
  sessionId,
}: Omit<HeldCard, 'cardKey'> & { sessionId: string }): ReactNode {
  const view = usePluginView({ pluginId, path, sessionId });

  return <DrawnPluginPage view={view} pluginId={pluginId} />;
}

interface Drawn {
  view: HeldCardView | undefined;
  pluginId: string;
}

// A page's tree once the view has one, with the Plugin's links opening its pages.
function DrawnPluginPage({ view, pluginId }: Drawn): ReactNode {
  const openPage = useOpenPluginPage();

  if (!view?.root) return null;

  return (
    <PluginTree
      key={view.treeKey}
      root={view.root}
      onEvent={view.dispatch}
      onOpenPage={(page) => openPage(pluginId, page)}
    />
  );
}
