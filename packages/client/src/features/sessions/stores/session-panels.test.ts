import { describe, expect, it } from 'vitest';
import {
  closePanel,
  hidePanels,
  noPanels,
  offeredPanels,
  reopenPanels,
  selectPanel,
  togglePanel,
} from './session-panels';

describe("a Session's Inspector panels", () => {
  it('opens a panel as a new tab and shows it', () => {
    const changes = togglePanel(noPanels, 'changes');

    expect(togglePanel(changes, 'subagents')).toEqual({
      tabs: ['changes', 'subagents'],
      shown: 'subagents',
    });
  });

  it("shows a panel's tab again when its trigger is pressed while another shows", () => {
    const both = togglePanel(togglePanel(noPanels, 'changes'), 'subagents');

    expect(togglePanel(both, 'changes')).toEqual({
      tabs: ['changes', 'subagents'],
      shown: 'changes',
    });
  });

  it('closes the shown tab when its trigger is pressed again', () => {
    const both = togglePanel(togglePanel(noPanels, 'changes'), 'subagents');

    expect(togglePanel(both, 'subagents')).toEqual({
      tabs: ['changes'],
      shown: 'changes',
    });
  });

  it('closes the Inspector with its last tab', () => {
    expect(closePanel(togglePanel(noPanels, 'changes'), 'changes')).toEqual(
      noPanels,
    );
  });

  it('keeps the shown tab when another one closes', () => {
    const both = togglePanel(togglePanel(noPanels, 'changes'), 'shells');

    expect(closePanel(both, 'changes')).toEqual({
      tabs: ['shells'],
      shown: 'shells',
    });
  });

  it('keeps the selected tab open when focused again', () => {
    const state = selectPanel(noPanels, 'subagents');

    expect(selectPanel(state, 'subagents')).toEqual(state);
  });

  it('selects an open tab', () => {
    const both = togglePanel(togglePanel(noPanels, 'changes'), 'shells');

    expect(selectPanel(both, 'changes').shown).toBe('changes');
  });

  it('drops the tab of a panel that has nothing to show', () => {
    const both = togglePanel(togglePanel(noPanels, 'changes'), 'subagents');

    expect(offeredPanels(both, ['changes', 'shells'])).toEqual({
      tabs: ['changes'],
      shown: 'changes',
    });
  });

  it('reopens with the tabs it held when it was closed', () => {
    const both = togglePanel(togglePanel(noPanels, 'subagents'), 'shells');
    const closed = hidePanels(selectPanel(both, 'subagents'));

    expect(closed.tabs).toEqual([]);
    expect(reopenPanels(closed, 'changes')).toEqual({
      tabs: ['subagents', 'shells'],
      shown: 'subagents',
    });
  });

  it('reopens with the first offered section when it held no tabs', () => {
    expect(reopenPanels(noPanels, 'changes')).toEqual({
      tabs: ['changes'],
      shown: 'changes',
    });
  });

  it('adds a tab opened while closed to the tabs it held', () => {
    const closed = hidePanels(togglePanel(noPanels, 'subagents'));

    expect(selectPanel(closed, 'shells')).toEqual({
      tabs: ['subagents', 'shells'],
      shown: 'shells',
    });
  });

  it('forgets tabs closed by hand', () => {
    const closed = hidePanels(
      closePanel(togglePanel(noPanels, 'subagents'), 'subagents'),
    );

    expect(reopenPanels(closed, 'changes')).toEqual({
      tabs: ['changes'],
      shown: 'changes',
    });
  });

  it('drops a held tab whose section is no longer offered', () => {
    const both = togglePanel(togglePanel(noPanels, 'subagents'), 'shells');

    expect(offeredPanels(hidePanels(both), ['subagents']).hidden).toEqual({
      tabs: ['subagents'],
      shown: 'subagents',
    });
  });
});
