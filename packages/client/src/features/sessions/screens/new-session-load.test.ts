import type { AgentInfo } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  firstAgent,
  mainProject,
  secondAgent,
} from '../state/session-choices.mocks';
import { loadedNewSession, type NewSessionQueries } from './new-session-load';

const serverName = 'Studio Mac';

const serverInfo = {
  version: '1.0.0',
  startedAt: '2026-10-14T09:00:00.000Z',
  pid: 4321,
  name: serverName,
};

type Loaded<Data> = { data: Data; isError: false };

const loaded = <Data>(data: Data): Loaded<Data> => ({
  data,
  isError: false,
});

const loading = { data: undefined, isError: false };

const queries = (agents: NewSessionQueries['agents']): NewSessionQueries => ({
  serverInfo: loaded(serverInfo),
  projects: loaded([mainProject]),
  agents,
});

const failedAgent: AgentInfo = {
  ...secondAgent,
  status: 'cant-start',
  reason: 'The Agent refused the Session.',
};

describe('loadedNewSession', () => {
  it('is ready before the Agents list arrives, offering no Agent while it loads', () => {
    expect(loadedNewSession(queries(loading))).toEqual({
      serverName,
      projects: [mainProject],
      agents: [],
      agentsLoading: true,
    });
  });

  it('offers only the usable Agents once the Agents list arrives', () => {
    expect(
      loadedNewSession(queries(loaded([firstAgent, failedAgent]))),
    ).toEqual({
      serverName,
      projects: [mainProject],
      agents: [firstAgent],
      agentsLoading: false,
    });
  });

  it('waits for the Server and its Projects', () => {
    expect(
      loadedNewSession({
        ...queries(loaded([firstAgent])),
        projects: loading,
      }),
    ).toBeUndefined();
  });
});
