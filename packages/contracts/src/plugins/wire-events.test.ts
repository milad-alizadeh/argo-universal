import { expect, it } from 'vitest';
import { PluginDispatchInput } from './wire';

const target = {
  pluginId: 'hello',
  path: '/',
  revision: 1,
  key: 'row',
  viewId: 'view',
};

it.each([
  { event: 'onPress' },
  { event: 'onLongPress' },
  { event: 'onChangeText', payload: 'draft' },
  { event: 'onSearchTextChange', payload: 'argo' },
  { event: 'onSelectionChange', payload: ['alpha', 'beta'] },
])('accepts the typed payload for $event', (interaction) => {
  expect(PluginDispatchInput.parse({ ...target, ...interaction })).toEqual({
    ...target,
    ...interaction,
  });
});

it.each([
  { event: 'onPress', payload: 'unexpected' },
  { event: 'onChangeText', payload: 42 },
  { event: 'onSearchTextChange' },
  { event: 'onSelectionChange', payload: ['alpha', 42] },
  { event: 'invented', payload: 'anything' },
])('refuses a mismatched payload for $event', (interaction) => {
  expect(
    PluginDispatchInput.safeParse({ ...target, ...interaction }).success,
  ).toBe(false);
});
