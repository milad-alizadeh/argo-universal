import { agentServers } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { changeAgentServer } from './registry-operations';

const agentId = 'example-agent';

const startHost = async (): Promise<{
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  savedWhenDropped: boolean[];
  drop: (id: string) => void;
}> => {
  const host = await startEngineTestHost();
  const savedWhenDropped: boolean[] = [];

  const drop = (id: string): void => {
    savedWhenDropped.push(
      host.database
        .select()
        .from(agentServers)
        .all()
        .some((row) => row.id === id),
    );
  };

  return { host, savedWhenDropped, drop };
};

it('saves an added Agent before it drops that Agent connections', async () => {
  const { host, savedWhenDropped, drop } = await startHost();

  await changeAgentServer(
    { databaseWriter: host.databaseWriter, dropAgentConnections: drop },
    agentId,
    'add',
  );

  expect(savedWhenDropped).toEqual([true]);
});

it('removes a saved Agent before it drops that Agent connections', async () => {
  const { host, savedWhenDropped, drop } = await startHost();

  const deps = {
    databaseWriter: host.databaseWriter,
    dropAgentConnections: drop,
  };

  await changeAgentServer(deps, agentId, 'add');
  await changeAgentServer(deps, agentId, 'remove');

  expect(savedWhenDropped).toEqual([true, false]);
});
