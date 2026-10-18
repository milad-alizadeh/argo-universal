import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import {
  interactionUi,
  reducePluginUi,
  type PluginUiState,
} from './plugin-ui-state';

it('keeps two Apps search and selection independent for the same page and key', () => {
  const first: PluginUiState = new Map();
  const second: PluginUiState = new Map();

  const searched = reducePluginUi(first, {
    key: 'issues',
    value: { searchText: 'Argo' },
  });

  const selected = reducePluginUi(searched, {
    key: 'issues',
    value: { selection: ['984'] },
  });

  expect(selected.get('issues')).toEqual({
    searchText: 'Argo',
    selection: ['984'],
  });
  expect(second.size).toBe(0);
  expect(first.size).toBe(0);
});

it('keeps a focused draft when other App-owned state changes', () => {
  const edited = reducePluginUi(new Map(), {
    key: 'name',
    value: { draft: 'my draft', focused: true },
  });

  const scrolled = reducePluginUi(edited, {
    key: 'name',
    value: { scroll: { x: 0, y: 64 }, open: true },
  });

  expect(scrolled.get('name')).toEqual({
    draft: 'my draft',
    focused: true,
    scroll: { x: 0, y: 64 },
    open: true,
  });
});

it.each([
  [
    { event: 'onSearchTextChange', payload: 'Argo' } as const,
    { searchText: 'Argo' },
  ],
  [
    {
      event: 'onSelectionChange',
      payload: ['984'],
    } satisfies PluginInteraction,
    { selection: ['984'] },
  ],
  [{ event: 'onChangeText', payload: 'draft' } as const, { draft: 'draft' }],
  [{ event: 'onPress' } as const, null],
])('retains only UI state from %j', (interaction, expected) => {
  expect(interactionUi(interaction)).toEqual(expected);
});
