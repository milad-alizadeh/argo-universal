import { expect, it } from 'vitest';
import { operations } from '.';
import { operationCatalog } from './catalog';

const lines = operationCatalog()
  .split('\n')
  .filter((line) => line.startsWith('- '));

const sorted = (ids: string[]): string[] =>
  ids.toSorted((a, b) => a.localeCompare(b));

const lineOf = (id: string): string | undefined =>
  lines.find((line) => line.startsWith(`- ${id}(`));

it('lists every Operation an Agent may run on its own line, and no App-only one', () => {
  const listed = lines.map((line) => line.slice(2).split('(', 1).join(''));

  const runnable = Object.values(operations)
    .filter(({ policy }) => policy !== 'person-only')
    .map(({ id }) => id);

  expect(sorted(listed)).toEqual(sorted(runnable));
});

it('names each param, marking the ones an Agent may leave out', () => {
  expect(lineOf('session.rename')).toContain('(title, sessionId?)');
  expect(lineOf('session.new')).toMatch(
    /^- session\.new\(.*projectId\?.*agent\?.*prompt\?.*\)/,
  );
  expect(lineOf('project.list')).toContain('project.list()');
});

it('gives each Operation the first sentence of its description', () => {
  expect(lineOf('session.cancel')).toContain('Cancel the selected Session’s');
});

it('says to run an Operation directly, and when to look one up', () => {
  const catalog = operationCatalog();

  expect(catalog).toContain(
    'Call simple Operations directly with operation_run',
  );
  expect(catalog).toContain('call operation_list with {"id":"operation.id"}');
});

it('shows a configuration override accepted by the Session creation schema', () => {
  const example = operationCatalog().match(
    /Configuration override: (.*)\. Use IDs/,
  )?.[1];

  expect(example).toBeDefined();
  expect(
    operations['session.new'].params.parse(JSON.parse(example ?? '')),
  ).toMatchObject({
    configOptions: [{ configId: '<configId>', value: '<value>' }],
  });
});

// About 2,000 tokens, including examples for common nested params.
it('stays under 9,000 characters', () => {
  expect(operationCatalog().length).toBeLessThan(9000);
});
