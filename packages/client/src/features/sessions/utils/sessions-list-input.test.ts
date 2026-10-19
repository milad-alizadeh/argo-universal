import { describe, expect, it } from 'vitest';
import type { SessionsView } from '../stores/sessions-view';
import {
  olderServerView,
  sessionsListInput,
  showsUnderStatus,
} from './sessions-list-input';

const defaults: SessionsView = {
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const chosen: SessionsView = {
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
        query: undefined,
      });
    },
  );

  it('passes the search', () => {
    expect(sessionsListInput(chosen, 'fix')).toStrictEqual({
      archived: undefined,
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

describe('the view an older Server can list after it refused this one', () => {
  it('falls back from All to Active, keeping the rest of the view', () => {
    expect(olderServerView(chosen, 'BAD_REQUEST')).toStrictEqual({
      ...chosen,
      status: 'active',
    });
  });

  it.each(['active', 'archived'] as const)(
    'has nothing to fall back to for %s',
    (status) => {
      expect(
        olderServerView({ ...chosen, status }, 'BAD_REQUEST'),
      ).toBeUndefined();
    },
  );

  it.each(['INTERNAL_SERVER_ERROR', 'TIMEOUT', undefined])(
    'keeps the view for any other failure (%s)',
    (code) => {
      expect(olderServerView(chosen, code)).toBeUndefined();
    },
  );
});
