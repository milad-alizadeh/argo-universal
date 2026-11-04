import { expect, it } from 'vitest';
import { Broadcast } from './broadcast';

it('tells a watch what was sent after it was asked for, before it is read', async () => {
  const marks = new Broadcast<string>();
  const abort = new AbortController();
  const watch = marks.watch(abort.signal);

  marks.send('/issues/:project');

  expect(await watch.next()).toEqual({
    done: false,
    value: '/issues/:project',
  });

  const next = watch.next();

  abort.abort();
  expect(await next).toEqual({ done: true, value: undefined });
});

it('ends every watch when it closes', async () => {
  const marks = new Broadcast<string>();
  const next = marks.watch(new AbortController().signal).next();

  marks.close();

  expect(await next).toEqual({ done: true, value: undefined });
});
