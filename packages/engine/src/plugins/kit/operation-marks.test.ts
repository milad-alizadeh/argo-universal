import { operationLimitMs } from '@repo/contracts/plugins/plugin-operations';
import { expect, it, vi } from 'vitest';
import type { CallOrigin } from '../protocol/call-origin';
import { operationMarks } from './operation-marks';

const operation = (id: number): CallOrigin => ({
  kind: 'operation',
  operation: id,
});

function marksOver(origin: CallOrigin) {
  const send = vi.fn(() => Promise.resolve());
  let now = 0;
  const marks = operationMarks(
    { pages: send, origin: () => origin },
    () => now,
  );

  return {
    marks,
    send,
    later: (ms: number): void => {
      now += ms;
    },
  };
}

it('holds a change said inside a running Operation for the mark its end makes', async () => {
  const { marks, send } = marksOver(operation(1));

  await marks
    .answering(() => Promise.resolve())
    .during(1, () => {
      marks.changed();

      return Promise.resolve();
    });

  expect(send).not.toHaveBeenCalled();
});

it('marks a change said after the Server gave up on the Operation, though its handler still runs', async () => {
  const { marks, send, later } = marksOver(operation(1));

  await marks
    .answering(() => Promise.resolve())
    .during(1, () => {
      later(operationLimitMs + 1);
      marks.changed();

      return Promise.resolve();
    });

  expect(send).toHaveBeenCalledWith({ action: 'changed' });
});
