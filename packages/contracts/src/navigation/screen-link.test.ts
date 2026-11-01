import { describe, expect, it } from 'vitest';
import {
  formatScreenLink,
  parseScreenLink,
  screenLinkPath,
  type ScreenDestination,
} from './screen-link';

const serverId = '6f1c2a9e-0d6b-4f0b-9a55-3c1f5b0e7a11';

const destinations: ScreenDestination[] = [
  { screen: 'session', sessionId: 'ses_01HZX-abc' },
  { screen: 'sessions' },
  { screen: 'project', projectId: 'prj_42' },
  { screen: 'agents' },
  { screen: 'settings' },
  {
    screen: 'plugin',
    pluginId: 'github',
    navId: 'pull-requests',
    page: ['repo', 'a b', 'über'],
  },
  { screen: 'plugin', pluginId: 'github', navId: 'home', page: [] },
];

describe('a Server-qualified Screen link', () => {
  it.each(destinations)('round trips %j', (destination) => {
    const link = formatScreenLink(serverId, destination);

    expect(parseScreenLink(link)).toEqual({
      ok: true,
      serverId,
      destination,
    });
  });

  it('names the Server and uses the argo scheme', () => {
    expect(
      formatScreenLink(serverId, { screen: 'session', sessionId: 'abc' }),
    ).toBe(`argo://open/${serverId}/session/abc`);
  });

  it('gives the App path the same link opens on the web', () => {
    expect(screenLinkPath(serverId, { screen: 'agents' })).toBe(
      `/open/${serverId}/agents`,
    );
  });

  it('reads the App path the web entry opens as the same link', () => {
    expect(parseScreenLink(`/open/${serverId}/sessions`)).toEqual({
      ok: true,
      serverId,
      destination: { screen: 'sessions' },
    });
  });

  it('keeps two Projects of one display name apart by id', () => {
    const first = formatScreenLink(serverId, {
      screen: 'project',
      projectId: 'a',
    });

    const second = formatScreenLink(serverId, {
      screen: 'project',
      projectId: 'b',
    });

    expect(first).not.toBe(second);
  });
});

describe('a malformed or unsafe link', () => {
  const refused = [
    'argo://open',
    `argo://open/${serverId}`,
    `argo://settings/projects/proj`,
    `argo://open/${serverId}/unknown`,
    `argo://open/${serverId}/session`,
    `argo://open/${serverId}/session/a/b`,
    `argo://open/${serverId}/sessions/extra`,
    `argo://open/${serverId}/session/%2e%2e`,
    `argo://open/${serverId}/constructor`,
    `argo://open/${serverId}/__proto__`,
    `argo://open/${serverId}/session/a%2Fb`,
    `argo://open/${serverId}/session/a%00b`,
    `argo://open/${serverId}/plugin/github`,
    `argo://open/${serverId}/plugin/GitHub/home`,
    `argo://open/${serverId}/plugin/github/home/%2e%2e/x`,
    `argo://open/${serverId}/plugin/github/home/./x`,
    `argo://open/${serverId}//sessions`,
    `argo://open/${serverId}/sessions?href=/settings`,
    `argo://open/${serverId}/sessions#x`,
    `argo://user@open/${serverId}/sessions`,
    `argo://open:80/${serverId}/sessions`,
    `ftp://open/${serverId}/sessions`,
    `https://example.test/open/${serverId}/sessions`,
    `/other/${serverId}/sessions`,
    'not a url',
    '',
  ];

  it.each(refused)('refuses %j', (link) => {
    expect(parseScreenLink(link)).toMatchObject({ ok: false });
  });
});
