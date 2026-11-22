import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createFakeTerminals } from '#mocks/fake-terminals';

const web = { name: 'web', command: 'pnpm web', ready: { pattern: 'Ready' } };

const api = { name: 'api', command: 'pnpm api', ready: { pattern: 'Ready' } };

const groupName = 'dev';

type Fixture = {
  caller: Awaited<ReturnType<typeof startAcpEngine>>['caller'];
  terminals: ReturnType<typeof createFakeTerminals>;
  sessionId: string;
};

async function groupProject(): Promise<Fixture> {
  const terminals = createFakeTerminals();

  const { caller } = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  onTestFinished(terminals.end);

  const { sessionId } = await caller.session.new(emptySessionInput);
  const { checkout } = await caller.session.get({ sessionId });
  await mkdir(join(checkout.path, '.argo'), { recursive: true });
  await writeFile(
    join(checkout.path, '.argo', 'run.json'),
    JSON.stringify({
      configurations: [web, api],
      groups: { [groupName]: { members: [api.name, web.name], stopAll: true } },
      default: groupName,
    }),
  );

  return { caller, terminals, sessionId };
}

it('starts every member of a group before waiting for their readiness', async () => {
  const { caller, terminals, sessionId } = await groupProject();

  const start = caller.run.startGroup({ sessionId, name: groupName });
  const first = await terminals.next();
  const second = await terminals.next();
  first.print('Ready');
  second.print('Ready');

  await expect(start).resolves.toMatchObject({
    name: groupName,
    members: [
      { name: api.name, ready: true },
      { name: web.name, ready: true },
    ],
  });
});

it('chooses the first ready member with a URL in configured order', async () => {
  const { caller, terminals, sessionId } = await groupProject();
  const start = caller.run.startGroup({ sessionId, name: groupName });
  const first = await terminals.next();
  const second = await terminals.next();
  second.print('Ready');

  await expect
    .poll(() => caller.run.status({ sessionId }))
    .toMatchObject({
      defaultGroup: {
        name: groupName,
        members: [api.name, web.name],
        readyCount: 1,
        url: `http://localhost:${second.launch.port}`,
      },
    });

  first.print('Ready');
  await start;

  await expect(caller.run.status({ sessionId })).resolves.toMatchObject({
    defaultGroup: {
      readyCount: 2,
      url: `http://localhost:${first.launch.port}`,
    },
  });
});

const startReadyGroup = async ({
  caller,
  terminals,
  sessionId,
}: Fixture): Promise<void> => {
  const start = caller.run.startGroup({ sessionId, name: groupName });
  (await terminals.next()).print('Ready');
  (await terminals.next()).print('Ready');
  await start;
};

it('stops all members when stopping one member of a stopAll group', async () => {
  const fixture = await groupProject();
  const { caller, sessionId } = fixture;
  await startReadyGroup(fixture);

  await expect(caller.run.stop({ sessionId, name: web.name })).resolves.toEqual(
    {
      name: web.name,
      status: 'stopped',
    },
  );

  await expect(caller.run.status({ sessionId })).resolves.toMatchObject({
    configurations: [
      { name: web.name, status: 'stopped' },
      { name: api.name, status: 'stopped' },
    ],
  });
});

it('stops a group through its own Operation', async () => {
  const fixture = await groupProject();
  const { caller, sessionId } = fixture;
  await startReadyGroup(fixture);

  await expect(
    caller.run.stopGroup({ sessionId, name: groupName }),
  ).resolves.toEqual({
    name: groupName,
    members: [
      { name: api.name, status: 'stopped' },
      { name: web.name, status: 'stopped' },
    ],
  });
});
