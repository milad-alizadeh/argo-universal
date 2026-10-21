import { PluginFailure } from '@repo/contracts/plugins/runtime';
import { describe, expect, it } from 'vitest';
import { pluginFailureToast } from './plugin-failure-toast';

const threw = 'Cannot read properties of undefined';

const key = '6f9619ff-8b86-4d01-b42d-00cf4fc964ff';

const failure = (kind: 'stopped' | 'drawing'): PluginFailure =>
  PluginFailure.parse({
    kind,
    pluginId: 'atlas',
    name: 'Atlas',
    message: threw,
    key,
  });

describe('pluginFailureToast', () => {
  it.each([
    { case: 'a Plugin that stopped', kind: 'stopped', title: 'Atlas stopped' },
    {
      case: 'a view a running Plugin could not draw',
      kind: 'drawing',
      title: 'Atlas could not draw a view',
    },
  ] as const)('says what happened for $case', ({ kind, title }) => {
    expect(pluginFailureToast(failure(kind)).title).toBe(title);
  });

  it("shows the Plugin's own words under the title", () => {
    expect(pluginFailureToast(failure('drawing')).message).toBe(threw);
  });

  // The failure's key is the toast's, so a Plugin's next failure shows again and a repeat does not.
  it('keys the toast by the failure it reports', () => {
    expect(pluginFailureToast(failure('drawing')).key).toBe(key);
  });
});
