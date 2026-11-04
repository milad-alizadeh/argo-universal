import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const attach = {
  name: 'attach',
  label: 'Attach the Issue',
  description: 'Attaches an Issue to the calling Session.',
  tier: 'act' as const,
  params: {
    number: {
      type: 'number' as const,
      description: 'The Issue number',
      required: true,
    },
  },
};

const source = `export function register(argo) {
  argo.operations.register('attach', async (params, caller) => ({
    attached: params.number,
    sessionId: caller.sessionId ?? null,
    projectId: caller.projectId ?? null,
  }));
}`;

it('lists a Plugin Operation in the registry and runs it in the worker', async () => {
  const fixture = await dataFixture(source, { operations: [attach] });
  const kit = await fixture.start();

  const rows = await kit.operations.list();

  expect(rows.map((row) => row.id)).toContain('data-fixture.attach');

  const result = await kit.operations.run({
    name: 'attach',
    params: { number: 1448 },
    caller: { sessionId: 'session-1', projectId: 'project-1' },
  });

  expect(result).toEqual({
    attached: 1448,
    sessionId: 'session-1',
    projectId: 'project-1',
  });
});

it('refuses params the Plugin did not declare', async () => {
  const fixture = await dataFixture(source, { operations: [attach] });
  const kit = await fixture.start();

  await expect(
    kit.operations.run({ name: 'attach', params: { number: 1, extra: true } }),
  ).rejects.toThrow(/extra/);

  await expect(
    kit.operations.run({ name: 'attach', params: {} }),
  ).rejects.toThrow(/number/);
});

it('answers the handler’s own error when it throws', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.operations.register('attach', async () => {
        throw new Error('No Session to attach the Issue to.');
      });
    }`,
    { operations: [attach] },
  );

  const kit = await fixture.start();

  await expect(
    kit.operations.run({ name: 'attach', params: { number: 7 } }),
  ).rejects.toThrow('No Session to attach the Issue to.');
});

it('refuses an Operation the Plugin never declared', async () => {
  const fixture = await dataFixture(source, { operations: [attach] });
  const kit = await fixture.start();

  await expect(kit.operations.run({ name: 'detach' })).rejects.toThrow(
    /detach/,
  );
});

const setStatus = {
  name: 'setStatus',
  label: 'Set the Issue status',
  description: 'Closes or reopens one Issue.',
  tier: 'act' as const,
  params: {
    status: {
      type: 'string' as const,
      description: 'The new status',
      required: true,
      choices: ['open', 'closed'],
    },
  },
  caller: ['project' as const, 'session' as const],
};

const echo = `export function register(argo) {
  argo.operations.register('setStatus', async (params, caller) => ({ params, caller }));
}`;

it('hands the handler the Project the run names, or else the caller’s', async () => {
  const fixture = await dataFixture(echo, { operations: [setStatus] });
  const kit = await fixture.start();
  const caller = { sessionId: 'session-1', projectId: 'project-1' };

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params: { status: 'open' },
      caller,
    }),
  ).resolves.toEqual({ params: { status: 'open' }, caller });

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params: { status: 'closed', projectId: 'project-2' },
      caller,
      confirm: () => Promise.resolve(),
    }),
  ).resolves.toEqual({
    params: { status: 'closed' },
    caller: { sessionId: 'session-1', projectId: 'project-2' },
  });
});

it('runs nothing in another Project than the Session’s when the user declines to confirm', async () => {
  const fixture = await dataFixture(echo, { operations: [setStatus] });
  const kit = await fixture.start();
  const caller = { sessionId: 'session-1', projectId: 'project-1' };
  const params = { status: 'open', projectId: 'project-2' };

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params,
      caller,
      confirm: () => Promise.reject(new Error('The user declined')),
    }),
  ).rejects.toThrow('The user declined');
});

it('refuses a run outside the param’s choices, or without what the Operation needs of its caller', async () => {
  const fixture = await dataFixture(echo, { operations: [setStatus] });
  const kit = await fixture.start();

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params: { status: 'done' },
      caller: { sessionId: 'session-1', projectId: 'project-1' },
    }),
  ).rejects.toThrow('Param status must be one of open, closed');

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params: { status: 'open', projectId: 'project-1' },
    }),
  ).rejects.toThrow('Only a Session can run setStatus');

  await expect(
    kit.operations.run({
      name: 'setStatus',
      params: { status: 'open' },
      caller: { sessionId: 'session-1' },
    }),
  ).rejects.toThrow('setStatus needs a Project');
});
