import type { AgentInfo } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { iconAgent } from '../components/registry-icons.mocks';
import { agentDetail } from './agent-detail';
import { installedAgents } from './agent-list';

const probed: AgentInfo = {
  agent: iconAgent.id,
  label: iconAgent.entry.name,
  logo: '',
  availability: 'not_signed_in',
  installStep: 'example-agent login',
};

describe('installedAgents', () => {
  it('reads each probe as a status and marks custom Agents', () => {
    const rows = installedAgents(
      [{ ...probed, availability: 'available' }],
      [{ id: iconAgent.id, name: 'Mine' }],
    );
    expect(rows).toEqual([
      expect.objectContaining({ status: 'ready', custom: true }),
    ]);
  });

  it('lists a custom Agent the probe has not reached as Unavailable', () => {
    const rows = installedAgents([], [{ id: 'mine', name: 'Mine' }]);
    expect(rows).toEqual([
      expect.objectContaining({ id: 'mine', status: 'unavailable' }),
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

  it('takes the status and sign-in command from the probe over the registry', () => {
    expect(agentDetail(probed, iconAgent)).toEqual(
      expect.objectContaining({
        status: 'sign-in',
        signInCommand: 'example-agent login',
        icon: iconAgent.entry.icon,
        version: iconAgent.entry.version,
      }),
    );
  });

  it('knows nothing about an Agent neither lists', () => {
    expect(agentDetail()).toBeUndefined();
  });
});
