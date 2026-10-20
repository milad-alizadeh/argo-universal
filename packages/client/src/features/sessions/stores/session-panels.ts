import { type Dispatch, type SetStateAction, useState } from 'react';

// What a Session's Inspector shows, each in its own tab, in the header's trigger order.
export const sessionPanelOrder = ['subagents', 'shells', 'changes'] as const;

export type SessionPanel = (typeof sessionPanelOrder)[number];

// The open tabs, in the order they opened, and the one shown; no tabs means the Inspector is closed.
export interface SessionPanelsState {
  tabs: readonly SessionPanel[];
  shown?: SessionPanel;
}

export const noPanels: SessionPanelsState = { tabs: [] };

export function selectPanel(
  state: SessionPanelsState,
  panel: SessionPanel,
): SessionPanelsState {
  if (state.tabs.includes(panel)) return { ...state, shown: panel };

  return { tabs: [...state.tabs, panel], shown: panel };
}

// Closing the shown tab shows the last one left.
export function closePanel(
  state: SessionPanelsState,
  panel: SessionPanel,
): SessionPanelsState {
  const tabs = state.tabs.filter((tab) => tab !== panel);

  if (tabs.length === 0) return noPanels;

  return { tabs, shown: state.shown === panel ? tabs.at(-1) : state.shown };
}

// A header trigger: shows its panel, opening its tab; pressed again while it shows, closes that tab.
export function togglePanel(
  state: SessionPanelsState,
  panel: SessionPanel,
): SessionPanelsState {
  if (state.shown === panel) return closePanel(state, panel);

  return selectPanel(state, panel);
}

// A tab exists only while its panel has something to show.
export function offeredPanels(
  state: SessionPanelsState,
  offered: readonly SessionPanel[],
): SessionPanelsState {
  const gone = state.tabs.filter((tab) => !offered.includes(tab));

  return gone.reduce(closePanel, state);
}

export interface SessionPanels {
  state: SessionPanelsState;
  toggle: (panel: SessionPanel) => void;
  select: (panel: SessionPanel) => void;
  close: (panel: SessionPanel) => void;
  closeAll: () => void;
}

type PanelChange = typeof togglePanel;

const changeWith =
  (setState: Dispatch<SetStateAction<SessionPanelsState>>) =>
  (change: PanelChange) =>
  (panel: SessionPanel): void =>
    setState((current) => change(current, panel));

// The Inspector's tabs for one open Session, limited to the panels it offers.
export function useSessionPanels(
  offered: readonly SessionPanel[],
): SessionPanels {
  const [state, setState] = useState(noPanels);
  const available = offeredPanels(state, offered);

  if (available !== state) setState(available);

  const on = changeWith(setState);

  return {
    state: available,
    toggle: on(togglePanel),
    select: on(selectPanel),
    close: on(closePanel),
    closeAll: () => setState(noPanels),
  };
}
