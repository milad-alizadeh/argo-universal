import { describe, expect, it } from 'vitest';
import { openLinkOutcome, openRoutePath } from './open-link-outcome';

const serverId = 'server-1';

const projects = [
  { id: 'p-1', name: 'argo' },
  { id: 'p-2', name: 'argo' },
];

const facts = { serverId, projects, stray: false };

const at = (segments: string[]): string => openRoutePath(segments);

describe('a link for this Server', () => {
  it.each([
    [['session', 's1'], { pathname: '/sessions/[id]', params: { id: 's1' } }],
    [['sessions'], '/sessions'],
    [['agents'], '/settings/agents'],
    [['settings'], '/settings'],
    [['plugin', 'github', 'prs', 'repo', '12'], '/plugins/github/prs/repo/12'],
  ])('opens %j', (path, href) => {
    expect(
      openLinkOutcome({ ...facts, link: at([serverId, ...path]) }),
    ).toEqual({
      status: 'open',
      href,
    });
  });

  it('selects the Project by its id when two share a display name', () => {
    expect(
      openLinkOutcome({ ...facts, link: at([serverId, 'project', 'p-2']) }),
    ).toEqual({
      status: 'open',
      href: {
        pathname: '/settings/projects/[name]',
        params: { name: 'argo', projectId: 'p-2' },
      },
    });
  });
});

describe('a link that cannot open', () => {
  it('waits for the Server to say which one it is', () => {
    expect(
      openLinkOutcome({
        ...facts,
        serverId: undefined,
        link: at([serverId, 'agents']),
      }),
    ).toEqual({ status: 'loading' });
  });

  it('never resolves a link for another Server against this one', () => {
    expect(
      openLinkOutcome({ ...facts, link: at(['other', 'session', 's1']) }),
    ).toMatchObject({
      status: 'refused',
      message: expect.stringContaining('another Server'),
    });
  });

  it('refuses a Project this Server does not have', () => {
    expect(
      openLinkOutcome({ ...facts, link: at([serverId, 'project', 'gone']) }),
    ).toMatchObject({
      status: 'refused',
      message: expect.stringContaining('Project'),
    });
  });

  it('waits for the Projects before judging a Project link', () => {
    expect(
      openLinkOutcome({
        ...facts,
        projects: undefined,
        link: at([serverId, 'project', 'p-1']),
      }),
    ).toEqual({ status: 'loading' });
  });

  it.each([
    [[serverId, 'session', '..']],
    [[serverId, 'session', 'a/b']],
    [[serverId, 'route', 'settings']],
    [[serverId]],
    [[]],
  ])('refuses the malformed link %j', (segments) => {
    expect(openLinkOutcome({ ...facts, link: at(segments) })).toMatchObject({
      status: 'refused',
    });
  });

  it('refuses a system link in the argo scheme the same way', () => {
    expect(
      openLinkOutcome({ ...facts, link: `argo://open/${serverId}/agents` }),
    ).toMatchObject({ status: 'open' });
    expect(
      openLinkOutcome({ ...facts, link: `argo://open/${serverId}/agents?x=1` }),
    ).toMatchObject({ status: 'refused' });
  });

  it('refuses a link that carries a query', () => {
    expect(
      openLinkOutcome({
        ...facts,
        stray: true,
        link: at([serverId, 'agents']),
      }),
    ).toMatchObject({ status: 'refused' });
  });
});
