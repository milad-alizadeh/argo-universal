import { expect, it, vi } from 'vitest';
import {
  createRequestAnswerReader,
  type RecordedRequestAnswer,
} from './request-answer.ts';

const unsupportedMessage = 'Unsupported answer';
const rejectedAnswer = (): RecordedRequestAnswer => {
  throw new Error(unsupportedMessage);
};
const acceptedAnswer = (): RecordedRequestAnswer => ({
  type: 'permission',
  optionId: 'allow_once',
});

it('counts rejected answers per reader without counting a successful answer', (): void => {
  const report = vi.spyOn(console, 'error').mockImplementation((): void => {});
  const read = createRequestAnswerReader();
  expect((): RecordedRequestAnswer => read(rejectedAnswer)).toThrow(
    unsupportedMessage,
  );
  expect(read(acceptedAnswer)).toEqual({
    type: 'permission',
    optionId: 'allow_once',
  });
  expect((): RecordedRequestAnswer => read(rejectedAnswer)).toThrow(
    unsupportedMessage,
  );
  const anotherReader = createRequestAnswerReader();
  expect((): RecordedRequestAnswer => anotherReader(rejectedAnswer)).toThrow(
    unsupportedMessage,
  );
  expect(report.mock.calls).toEqual([
    ['Mock CLI rejected request answer (1)'],
    ['Mock CLI rejected request answer (2)'],
    ['Mock CLI rejected request answer (1)'],
  ]);
});
