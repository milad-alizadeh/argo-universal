import { type Dispatch, type SetStateAction, useState } from 'react';

// The open tabs, each a section's key, in the order they opened, and the one shown; no tabs means the Inspector is closed.
export interface SessionPanelsState {
  tabs: readonly string[];
  shown?: string;
  // How often a card asked each tab to start over at its first page, as a Change row asks Changes for its detail after Files was picked.
  requests?: Readonly<Record<string, number>>;
}

export const noPanels: SessionPanelsState = { tabs: [] };

export function selectPanel(
  state: SessionPanelsState,
  panel: string,
): SessionPanelsState {
  if (state.tabs.includes(panel)) return { ...state, shown: panel };

  return { ...state, tabs: [...state.tabs, panel], shown: panel };
}

// Closing the shown tab shows the last one left.
export function closePanel(
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

// A tab exists only while its section is offered.
export function offeredPanels(
  state: SessionPanelsState,
  offered: readonly string[],
): SessionPanelsState {
  const gone = state.tabs.filter((tab) => !offered.includes(tab));

  return gone.reduce(closePanel, state);
}

export interface SessionPanels {
  state: SessionPanelsState;
  toggle: (panel: string) => void;
  select: (panel: string) => void;
  close: (panel: string) => void;
  request: (panel: string) => void;
  closeAll: () => void;
}

type PanelChange = typeof togglePanel;

const changeWith =
  (setState: Dispatch<SetStateAction<SessionPanelsState>>) =>
  (change: PanelChange) =>
  (panel: string): void =>
    setState((current) => change(current, panel));

// The Inspector's tabs for one open Session, limited to the sections it offers.
export function useSessionPanels(offered: readonly string[]): SessionPanels {
  const [state, setState] = useState(noPanels);
  const available = offeredPanels(state, offered);

  if (available !== state) setState(available);

  return panelActions(available, setState);
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
    closeAll: () => setState(noPanels),
  };
}
