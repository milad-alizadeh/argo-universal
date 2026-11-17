import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller, runOperation } from '#mocks/operations';

async function validate(source: string): ReturnType<typeof runOperation> {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  const caller = await operationCaller(host);

  return runOperation(caller.operations, {
    id: 'diagram.validate',
    params: { source },
  });
}

it('passes a Mermaid fence the Apps can draw', async () => {
  expect(await validate('flowchart LR\n  A[Send] --> B[Queue]')).toEqual({
    valid: true,
  });
});

it('names the line of a fence the Apps would leave out, and the kinds they draw', async () => {
  expect(
    await validate('sequenceDiagram\n  A->>B: hi\n  not mermaid at all'),
  ).toMatchObject({
    valid: false,
    problems: [{ line: 3 }],
    supported: expect.arrayContaining(['flowchart', 'sequenceDiagram']),
  });
});
