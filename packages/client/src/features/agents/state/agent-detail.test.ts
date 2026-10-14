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

  it('offers a newer release only once the Agent is Ready', () => {
    const newer = { version: '1.0.0', availableVersion: '1.1.0' };
    const rows = installedAgents(
      [
        { ...probed, ...newer, status: 'ready' },
        { ...probed, ...newer, agent: 'second', status: 'cant-start' },
      ],
      [],
    );
    expect(rows.map(({ status }) => status)).toEqual(['update', 'cant-start']);
  });

  it('marks a disabled Agent without changing its status', () => {
    const rows = installedAgents([{ ...probed, enabled: false }], []);
    expect(rows).toEqual([
      expect.objectContaining({ status: signInNeeded, disabled: true }),
    ]);
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
        version: iconAgent.entry.version,
      }),
    );
  });

  it('knows nothing about an Agent neither lists', () => {
    expect(agentDetail()).toBeUndefined();
  });
});
