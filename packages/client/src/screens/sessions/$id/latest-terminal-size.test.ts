import { expect, it, vi } from 'vitest';
import { LatestTerminalSize } from './latest-terminal-size';

it('sends the final Terminal size after a pending resize settles', async () => {
  const size = new LatestTerminalSize();
  const first = { columns: 45, rows: 24 };
  const middle = { columns: 55, rows: 30 };
  const last = { columns: 65, rows: 32 };
  const acknowledged = Promise.withResolvers<void>();
  const send = vi.fn(() => acknowledged.promise);

  size.request(first, send);
  size.request(middle, send);
  size.request(last, send);

  expect(send.mock.calls).toEqual([[first]]);

  acknowledged.resolve();

  await expect.poll(() => send.mock.calls).toEqual([[first], [last]]);
});
