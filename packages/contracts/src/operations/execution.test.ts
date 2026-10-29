import { expect, it } from 'vitest';
import { OperationRunResponse } from './execution';

const execution = {
  kind: 'operation_execution',
  id: `call:session-1:${'a'.repeat(64)}`,
  status: 'still_running',
};

it('tells an Operation result from the native work it started by its tag', () => {
  const answer = { kind: 'result', result: [{ id: 'project-1' }] };

  expect(OperationRunResponse.parse(answer)).toEqual(answer);
  expect(OperationRunResponse.parse(execution)).toEqual(execution);
});

it('refuses an untagged result', () => {
  expect(OperationRunResponse.safeParse([{ id: 'project-1' }]).success).toBe(
    false,
  );
  expect(
    OperationRunResponse.safeParse({ kind: 'result', result: 1, extra: true })
      .success,
  ).toBe(false);
});
