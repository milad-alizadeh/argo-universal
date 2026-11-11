import { type Dispatch, type SetStateAction, useState } from 'react';
import { SessionMemory, useSessionMemory } from './session-memory';

// The open tabs, each a section's key, in the order they opened, and the one shown; no tabs means the Inspector is closed.
export interface SessionPanelsState {
  tabs: readonly string[];
  shown?: string;
  // How often a card asked each tab to start over at its first page, as a Change row asks Changes for its detail after Files was picked.
  requests?: Readonly<Record<string, number>>;
  // The tabs a closed Inspector held, which it opens with again; only closing each tab by hand forgets them.
  hidden?: HiddenPanels;
}

type HiddenPanels = Pick<SessionPanelsState, 'tabs' | 'shown'>;

export const noPanels: SessionPanelsState = { tabs: [] };

// Closing the Inspector keeps its tabs to open with again.
export function hidePanels(state: SessionPanelsState): SessionPanelsState {
  if (state.tabs.length === 0) return state;

  return {
    ...noPanels,
    requests: state.requests,
    hidden: { tabs: state.tabs, shown: state.shown },
  };
}

function restoredPanels(state: SessionPanelsState): SessionPanelsState {
  const { hidden, ...rest } = state;

  if (!hidden || state.tabs.length > 0) return state;

  return { ...rest, ...hidden };
}

// Opens the Inspector with the tabs it last held, or with `panel` when it held none.
export function reopenPanels(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  const restored = restoredPanels(state);

  return restored.tabs.length > 0 ? restored : selectPanel(state, panel);
}

// Opening a tab on a closed Inspector brings back the tabs it held.
export function selectPanel(
  current: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  const state = restoredPanels(current);

  if (state.tabs.includes(panel)) return { ...state, shown: panel };

  return { ...state, tabs: [...state.tabs, panel], shown: panel };
}

// Closing the shown tab shows the last one left; closing a tab that is not open changes nothing.
export function closePanel(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  return state.tabs.includes(panel) ? closeOpenPanel(state, panel) : state;
}

function closeOpenPanel(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  const tabs = state.tabs.filter((tab) => tab !== panel);

  if (tabs.length === 0) return noPanels;

  return {
    ...state,
    tabs,
    shown: state.shown === panel ? tabs.at(-1) : state.shown,
  };
}

// Shows its panel, opening its tab; pressed again while it shows, closes that tab.
export function togglePanel(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  if (state.shown === panel) return closePanel(state, panel);

  return selectPanel(state, panel);
}

function requestPanel(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  return {
    ...selectPanel(state, panel),
    requests: {
      ...state.requests,
      [panel]: (state.requests?.[panel] ?? 0) + 1,
    },
  };
}

const keptShown = (
  shown: string | undefined,
  tabs: readonly string[],
): string | undefined =>
  shown !== undefined && tabs.includes(shown) ? shown : tabs.at(-1);

// The set-aside tabs whose sections are still offered; none left forgets them.
const offeredHidden = (
  hidden: HiddenPanels,
  offered: readonly string[],
): Pick<SessionPanelsState, 'hidden'> => {
  const tabs = hidden.tabs.filter((tab) => offered.includes(tab));

  if (tabs.length === 0) return {};

  return { hidden: { tabs, shown: keptShown(hidden.shown, tabs) } };
};

// A tab exists only while its section is offered, open or set aside.
export function offeredPanels(
  state: SessionPanelsState,
  offered: readonly string[],
): SessionPanelsState {
  const gone = state.tabs.filter((tab) => !offered.includes(tab));
  const { hidden, ...open } = gone.reduce(closePanel, state);

  return hidden ? { ...open, ...offeredHidden(hidden, offered) } : open;
}

export interface SessionPanels {
  state: SessionPanelsState;
  toggle: (panel: string) => void;
  select: (panel: string) => void;
  close: (panel: string) => void;
  request: (panel: string) => void;
  // Opens the tabs a closed Inspector held, or `panel` when it held none.
  reopen: (panel: string) => void;
  // Closes the Inspector, keeping its tabs for `reopen`.
  hide: () => void;
}

type PanelChange = typeof togglePanel;

const changeWith =
  (setState: Dispatch<SetStateAction<SessionPanelsState>>) =>
  (change: PanelChange) =>
  (panel: string): void =>
    setState((current) => change(current, panel));

const panelMemory = new SessionMemory(noPanels);

// A Session's tabs, remembered while the person opens another; without a Session, the page's own.
function usePanelState(
  sessionId: string | undefined,
): [SessionPanelsState, Dispatch<SetStateAction<SessionPanelsState>>] {
  const own = useState(noPanels);
  const remembered = useSessionMemory(panelMemory, sessionId ?? '');

  return sessionId === undefined ? own : remembered;
}

// Closes one Session's tab from outside its page, as when a Plugin card that had something has nothing.
export const closeSessionPanel = (sessionId: string, panel: string): void =>
  panelMemory.write(sessionId, (state) => closePanel(state, panel));

// The Inspector's tabs for one open Session, limited to the sections it offers.
export function useSessionPanels(
  offered: readonly string[],
  sessionId?: string,
): SessionPanels {
  const [state, setState] = usePanelState(sessionId);

  // Only drawn limited to what is offered: a tab whose section is not yet offered, as on a page that has just opened, stays remembered.
  return panelActions(offeredPanels(state, offered), setState);
}

function panelActions(
  state: SessionPanelsState,
  setState: Dispatch<SetStateAction<SessionPanelsState>>,
): SessionPanels {
  const on = changeWith(setState);

  return {
    state,
    toggle: on(togglePanel),
    select: on(selectPanel),
    close: on(closePanel),
    request: on(requestPanel),
    reopen: on(reopenPanels),
    hide: () => setState(hidePanels),
  };
}
