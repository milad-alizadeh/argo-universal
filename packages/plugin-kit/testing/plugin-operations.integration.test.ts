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
