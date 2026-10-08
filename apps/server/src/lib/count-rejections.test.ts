import { expect, it, vi } from 'vitest';
import { createRejectionCounter } from './count-rejections';

const readerLabel = 'reader';
const rejectedRow = 'rejected row';
const firstReaderReport = 'reader: rejected row #1';

it('starts each counter with no rejected values', (): void => {
  expect(createRejectionCounter(readerLabel).count()).toBe(0);
});

it('keeps a new reader counter independent of an existing reader', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});
  const existing = createRejectionCounter(readerLabel);
  existing.report(rejectedRow);
  const another = createRejectionCounter(readerLabel);
  another.report(rejectedRow);
  expect(log.mock.calls).toEqual([[firstReaderReport], [firstReaderReport]]);
  expect(existing.count()).toBe(1);
  expect(another.count()).toBe(1);
});

it('includes the supplied rejection error in the report', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});
  const counter = createRejectionCounter('decoder');
  const error = new Error('Unexpected row');
  counter.report('rejected shape', error);
  expect(log).toHaveBeenCalledExactlyOnceWith(
    'decoder: rejected shape #1',
    error,
  );
});

it('reports successive rejections with a label and sequence number', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});
  const counter = createRejectionCounter(readerLabel);
  counter.report(rejectedRow);
  counter.report(rejectedRow);
  expect(log.mock.calls).toEqual([
    [firstReaderReport],
    ['reader: rejected row #2'],
  ]);
  expect(counter.count()).toBe(2);
});
