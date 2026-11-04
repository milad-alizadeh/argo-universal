import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import { PluginFailures } from './failures';

const failures = (): PluginFailures =>
  new PluginFailures((pluginId) => ({ pluginId, name: pluginId }));

const address = (path: string): PageAddress => ({
  pluginId: 'counter',
  path,
  pageState: {},
});

it('keeps only the latest drawing failures of a Plugin, so addresses cannot grow it', () => {
  const kept = failures();

  for (let page = 0; page < 1000; page += 1)
    kept.failed(address(`/page-${page}`), 'it threw');

  // The oldest address drew nothing since, so a draw of it clears nothing the Plugin still holds.
  expect(kept.failed(address('/page-0'), 'it threw')).toBe(true);
});
