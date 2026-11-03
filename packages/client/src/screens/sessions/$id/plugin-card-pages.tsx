import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
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
  card,
}: Holding & { card: HeldCard }): null {
  const { pluginId, path } = card;

  useHoldView(
    store,
    card.cardKey,
    usePluginView({ pluginId, path, sessionId }),
  );

  return null;
}

// Keeps the view in the store while it lasts; its dispatch changes every render, so the held one calls the current.
function useHoldView(
  store: HeldCardStore,
  cardKey: string,
  { root, treeKey, dispatch }: HeldCardView,
): void {
  const latest = useLatest(dispatch);

  useEffect(() => {
    store.hold(cardKey, {
      root,
      treeKey,
      dispatch: (...event) => latest.current(...event),
    });
  }, [store, cardKey, root, treeKey, latest]);

  useEffect(() => (): void => store.release(cardKey), [store, cardKey]);
}

function useLatest<Value>(value: Value): { current: Value } {
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  });

  return latest;
}

// A card's page, drawn from the view the Session holds for it; nothing until that view has a tree.
export function HeldCardPage({
  store,
  card,
}: {
  store: HeldCardStore;
  card: Omit<HeldCard, 'path'>;
}): ReactNode {
  const view = useSyncExternalStore(store.subscribe, () =>
    store.view(card.cardKey),
  );

  return <DrawnPluginPage view={view} pluginId={card.pluginId} />;
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
