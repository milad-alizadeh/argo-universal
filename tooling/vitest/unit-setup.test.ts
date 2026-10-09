import { expect, it } from 'vitest';

it('rejects a unit test network call before it starts', (): void => {
  expect((): Promise<Response> => fetch('data:text/plain,unexpected')).toThrow(
    'Unit tests cannot use the network',
  );
});

it('rejects a unit test WebSocket before it opens', (): void => {
  expect((): WebSocket => new WebSocket('ws:')).toThrow(
    'Unit tests cannot use the network',
  );
});
