import type { AgentInfo } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { iconAgent } from '../components/registry-icons.mocks';
import { agentDetail } from './agent-detail';
import { installedAgents } from './agent-list';

const signInNeeded = 'sign-in-needed';

const signInReason = 'The Agent requires sign-in.';

const probed: AgentInfo = {
  agent: iconAgent.id,
  label: iconAgent.entry.name,
  logo: '',
  enabled: true,
  status: signInNeeded,
  reason: signInReason,
};

describe('installedAgents', () => {
  it('reads each probe as a status and marks custom Agents', () => {
    const rows = installedAgents(
      [{ ...probed, status: 'ready' }],
      [{ id: iconAgent.id, name: 'Mine' }],
    );

    expect(rows).toEqual([
      expect.objectContaining({ status: 'ready', custom: true }),
    ]);
  });

  it('lists a custom Agent the list has not reached yet as Checking…', () => {
    const rows = installedAgents([], [{ id: 'mine', name: 'Mine' }]);
    expect(rows).toEqual([
      expect.objectContaining({ id: 'mine', status: 'checking' }),
    ]);
  });

  it('keeps the Server’s reason with its status', () => {
    expect(installedAgents([probed], [])).toEqual([
      expect.objectContaining({
        status: signInNeeded,
        reason: signInReason,
      }),
    ]);
  });

  it('marks a disabled Agent without changing its status', () => {
    const rows = installedAgents([{ ...probed, enabled: false }], []);
    expect(rows).toEqual([
      expect.objectContaining({ status: signInNeeded, disabled: true }),
    ]);
  });

  it('reads a disabled Agent that was never checked as Disabled, never Checking…', () => {
    const rows = installedAgents(
      [
        { ...probed, enabled: false, status: 'checking' },
        { ...probed, agent: 'enabled', status: 'checking' },
      ],
      [],
    );

    expect(rows.map(({ status }) => status)).toEqual(['disabled', 'checking']);
  });
});

describe('agentDetail', () => {
  it('shows a registry Agent as not installed, with its version and distribution', () => {
    expect(agentDetail(undefined, iconAgent)).toEqual(
      expect.objectContaining({
        status: 'not-installed',
        version: iconAgent.entry.version,
        distribution: 'npm · needs Node.js',
      }),
    );
  });

  it('takes the status and reason from the Server over the registry', () => {
    expect(agentDetail(probed, iconAgent)).toEqual(
      expect.objectContaining({
        status: signInNeeded,
        reason: signInReason,
        icon: iconAgent.entry.icon,
      }),
    );
  });

  it("shows an installed Agent's own versions, never the catalog's release", () => {
    expect(agentDetail(probed, iconAgent)?.version).toBeUndefined();
    expect(
      agentDetail(
        { ...probed, version: '0.9.2', agentVersion: '0.47.0' },
        iconAgent,
      ),
    ).toEqual(
      expect.objectContaining({ version: '0.9.2', agentVersion: '0.47.0' }),
    );
  });

  it.each([
    ['unknown', 'Found on this Mac'],
    ['argo', 'Installed by Argo'],
    ['homebrew', 'Installed with Homebrew'],
    ['npm', 'Installed with npm'],
  ] as const)(
    'names where an installed Agent owned by %s was found instead of how the Server installs it',
    (owner, source) => {
      expect(agentDetail({ ...probed, owner }, iconAgent)).toEqual(
        expect.objectContaining({ source, distribution: undefined }),
      );
    },
  );

  it('keeps where an outside copy is and the command its owner updates it with', () => {
    const outside = {
      ...probed,
      owner: 'homebrew',
      path: '/opt/homebrew/bin/agent',
      updateCommand: 'brew upgrade agent',
    } as const;

    expect(agentDetail(outside, iconAgent)).toEqual(
      expect.objectContaining({
        owner: 'homebrew',
        path: outside.path,
        updateCommand: outside.updateCommand,
      }),
    );
  });

  it('knows nothing about an Agent neither lists', () => {
    expect(agentDetail()).toBeUndefined();
  });
});
