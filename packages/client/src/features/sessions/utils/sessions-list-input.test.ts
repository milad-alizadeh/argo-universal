import { describe, expect, it } from 'vitest';
import type { SessionsView } from '../stores/sessions-view';
import { sessionsListInput, showsUnderStatus } from './sessions-list-input';

const defaults: SessionsView = {
  order: 'activity',
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const chosen: SessionsView = {
  order: 'created',
  group: 'none',
  status: 'all',
  layout: 'compact',
};

describe('what session.list is asked for the view', () => {
  it.each([
    { status: 'active', archived: false },
    { status: 'archived', archived: true },
    // All asks with no `archived` filter, for active and archived Sessions together.
    { status: 'all', archived: undefined },
  ] as const)(
    'asks $status with archived $archived',
    ({ status, archived }) => {
      expect(sessionsListInput({ ...defaults, status }, '')).toStrictEqual({
        archived,
        order: 'activity',
        query: undefined,
      });
    },
  );

  it('passes the order and the search', () => {
    expect(sessionsListInput(chosen, 'fix')).toStrictEqual({
      archived: undefined,
      order: 'created',
      query: 'fix',
    });
  });
});

describe('which Sessions a status shows', () => {
  it.each([
    { status: 'active', archivedAt: null, shows: true },
    { status: 'active', archivedAt: 1, shows: false },
    { status: 'archived', archivedAt: null, shows: false },
    { status: 'archived', archivedAt: 1, shows: true },
    { status: 'all', archivedAt: null, shows: true },
    { status: 'all', archivedAt: 1, shows: true },
  ] as const)(
    '$status shows a Session archived at $archivedAt: $shows',
    ({ status, archivedAt, shows }) => {
      expect(showsUnderStatus(status, archivedAt)).toBe(shows);
    },
  );
});
