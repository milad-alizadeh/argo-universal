import type { Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';

// Initial saved commands are fixture data; all admission and launch behavior is real.
export const seedAgentFixtures = (
  database: Database,
  identities: readonly AgentIdentity[],
): void => {
  const insert = database.$client.prepare(
    'insert into agents (id, enabled, configuration) values (?, 1, ?) on conflict(id) do update set configuration = excluded.configuration',
  );

  for (const identity of identities)
    insert.run(
      identity.agent,
      JSON.stringify({
        source: 'custom',
        definition: {
          name: identity.label,
          ...scriptedAgentCommand('reply'),
          env: [],
        },
      }),
    );
};
