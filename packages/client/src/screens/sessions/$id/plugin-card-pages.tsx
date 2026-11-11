import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { closeSessionPanel } from '#features/sessions';
import { BoundedPluginTree } from '../../../lib/product/plugin-registry';
import type { PageOpening } from '../../plugins/page-addresses';
import { useOpenPluginPage } from '../../plugins/use-plugin-opener';
import { usePluginPage } from '../../plugins/use-plugin-page';
import type { HeldCardPage, HeldCardStore } from './held-card-store';

// One declared card's page, watched for a Session whether or not its card is drawn.
export interface HeldCard {
  cardKey: string;
  pluginId: string;
  path: string;
}

// The Session a card draws for, once its Feed has said which Project it is in.
export interface CardOpening {
  sessionId: string;
  projectId: string;
}

// How a card's page is drawn: the Loader cache's, unless a story stands in for it.
export type UsePage = (opening: PageOpening) => HeldCardPage;

interface Holding {
  store: HeldCardStore;
  opening: CardOpening | undefined;
  usePage?: UsePage;
}

/*
 * Draws every card's page for the Session through the Loader cache and keeps each answer in the store, so Argo
 * knows which cards have something to show before it draws any: a card whose page answers nothing is not drawn
 * (ADR-0035). With no Project yet, nothing is asked and no card is drawn.
 */
export function HeldCardPages({
  cards,
  opening,
  ...holding
}: Holding & { cards: readonly HeldCard[] }): ReactNode {
  if (!opening) return null;

  return cards.map((card) => (
    <HeldPage
      key={`${opening.sessionId}/${card.cardKey}`}
      {...holding}
      opening={opening}
      card={card}
    />
  ));
}

function HeldPage({
  store,
  opening,
  card: { cardKey, pluginId, path },
  usePage = usePluginPage,
}: Omit<Holding, 'opening'> & {
  opening: CardOpening;
  card: HeldCard;
}): null {
  const page = usePage({ pluginId, path, ...opening });

  useHoldPage({ store, sessionId: opening.sessionId, cardKey }, page);

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

type Held = { store: HeldCardStore; sessionId: string; cardKey: string };

/*
 * Keeps one card's page in the store while it lasts. A page that answers nothing, on its first answer or after drawing, closes its
 * Inspector tab, or its sheet on a phone, so neither comes back unasked; one still waiting for its Plugin keeps its tab. The page's call handler
 * changes with its render, so the held one calls the current.
 */
function useHoldPage(
  { store, sessionId, cardKey }: Held,
  { root, onPageCall }: HeldCardPage,
): void {
  const latest = useCurrent(onPageCall);

  useEffect(() => {
    const call: HeldCardPage['onPageCall'] = (...args) =>
      latest.current(...args);

    if (store.hold(cardKey, { root, onPageCall: call }))
      closeSessionPanel(sessionId, cardKey);
  }, [store, sessionId, cardKey, root, latest]);

  useEffect(() => (): void => store.release(cardKey), [store, cardKey]);
}

// A card's page, drawn from the answer the Session holds for it; nothing until that answer has a tree.
export function HeldCardView({
  store,
  cardKey,
  pluginId,
}: Omit<HeldCard, 'path'> & { store: HeldCardStore }): ReactNode {
  const page = useSyncExternalStore(store.subscribe, () => store.page(cardKey));

  return <DrawnPluginPage page={page} pluginId={pluginId} />;
}

/*
 * A card's full view, drawn for the Session while its Inspector tab or sheet is open, as the Plugin's own pages are.
 * The tab's frame is Argo's and draws at once; the page fills it when the Plugin answers (ADR-0025 lazy start).
 */
export function PluginTabPage({
  projectId,
  ...rest
}: Omit<HeldCard, 'cardKey'> & {
  sessionId: string;
  projectId?: string;
}): ReactNode {
  if (projectId === undefined) return null;

  return <DrawnTabPage opening={{ ...rest, projectId }} />;
}

function DrawnTabPage({ opening }: { opening: PageOpening }): ReactNode {
  return (
    <DrawnPluginPage
      page={usePluginPage(opening)}
      pluginId={opening.pluginId}
    />
  );
}

interface Drawn {
  page: HeldCardPage | undefined;
  pluginId: string;
}

// A page's tree once it has one, with the Plugin's links opening its pages.
function DrawnPluginPage({ page, pluginId }: Drawn): ReactNode {
  const openPage = useOpenPluginPage();

  if (!page?.root) return null;

  return (
    <BoundedPluginTree
      root={page.root}
      onOpenPage={(opened) => openPage(pluginId, opened)}
      onPageCall={page.onPageCall}
    />
  );
}
