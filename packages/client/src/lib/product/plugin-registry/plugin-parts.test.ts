import { wireParts } from '@repo/contracts/plugins/kit';
import { expect, it } from 'vitest';
import { pluginPartVersions } from './plugin-parts';

it('advertises every wire part', () => {
  expect(Object.keys(pluginPartVersions)).toEqual(Object.keys(wireParts));
});
