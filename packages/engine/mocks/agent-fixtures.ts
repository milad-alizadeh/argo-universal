import type { ACPAgent, ACPAgentRegistry } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';

export const fixtureRegistry = (
  identities: readonly AgentIdentity[],
  environment?: Record<string, string>,
): ACPAgentRegistry => ({
  version: '1.0.0',
  extensions: [],
  agents: identities.map((identity) => registryEntry(identity, environment)),
});

const registryEntry = (
  identity: AgentIdentity,
  environment?: Record<string, string>,
): ACPAgent => ({
  id: identity.agent,
  name: identity.label,
  version: '1.0.0',
  license_url: 'https://example.org/license',
  icon: identity.logo
    ? `data:image/svg+xml,${encodeURIComponent(identity.logo)}`
    : undefined,
  description: 'Scripted ACP Agent',
  distribution: registryDistribution(environment),
});

const registryDistribution = (
  environment?: Record<string, string>,
): ACPAgent['distribution'] => ({
  binary: {
    [`${process.platform}-${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}`]:
      {
        archive: 'https://example.org/agent',
        cmd: './agent',
        env: environment,
      },
  },
});

// Fixture data at the Registry boundary; production code admits and launches saved rows.
export const seedAgentFixtures = (
  database: Database,
  identities: readonly AgentIdentity[],
): void => {
  const insert = database.$client.prepare(
    'INSERT OR IGNORE INTO agent_servers (id) VALUES (?)',
  );

  for (const identity of identities) insert.run(identity.agent);

  if (identities.length === 0) return;
  database.$client
    .prepare(
      'INSERT INTO registry_cache (id, json, fetched_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at',
    )
    .run(JSON.stringify(fixtureRegistry(identities)), Date.now());
};
