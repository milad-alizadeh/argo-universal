import { expect, it } from 'vitest';
import { StaleMark } from './page-address';

it('carries the Draft region the Agent is writing beside the Plugin', () => {
  expect(StaleMark.parse({ pluginId: 'issues', region: 'list' })).toEqual({
    pluginId: 'issues',
    region: 'list',
  });
});

it('stays as it was for a mark that names no region', () => {
  expect(StaleMark.parse({ pluginId: 'issues' })).toEqual({
    pluginId: 'issues',
  });
});

it('refuses an empty region', () => {
  expect(StaleMark.safeParse({ pluginId: 'issues', region: '' }).success).toBe(
    false,
  );
});
