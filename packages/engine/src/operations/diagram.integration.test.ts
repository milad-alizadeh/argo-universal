import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller, runOperation } from '#mocks/operations';

it('checks a Mermaid fence with the renderer the Apps draw it with', async () => {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  const caller = await operationCaller(host);

  const valid = await runOperation(caller.operations, {
    id: 'diagram.validate',
    params: { source: 'flowchart LR\n  A[Send] --> B[Queue]' },
  });

  const invalid = await runOperation(caller.operations, {
    id: 'diagram.validate',
    params: { source: 'sequenceDiagram\n  A->>B: hi\n  not mermaid at all' },
  });

  expect(valid).toEqual({ valid: true });
  expect(invalid).toMatchObject({
    valid: false,
    problems: [{ line: 3 }],
    supported: expect.arrayContaining(['flowchart', 'sequenceDiagram']),
  });
});
