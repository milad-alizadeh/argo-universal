import { describe, expect, it } from 'vitest';
import {
  closePanel,
  noPanels,
  offeredPanels,
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
});
