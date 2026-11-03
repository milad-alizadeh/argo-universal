import { expect, it } from 'vitest';
import { StaleMarks } from './stale-marks';

it('tells a watching App the patterns an Operation marked, and skips an empty mark', async () => {
  const marks = new StaleMarks();
  const abort = new AbortController();
  const watch = marks.watch(abort.signal);
  const first = watch.next();

  marks.mark({ pluginId: 'tracker', stale: [] });
  marks.mark({ pluginId: 'tracker', stale: ['/issues/:project'] });

  expect(await first).toEqual({
    done: false,
    value: { pluginId: 'tracker', stale: ['/issues/:project'] },
  });
  abort.abort();
});

it('ends every watch when the marks close', async () => {
  const marks = new StaleMarks();
  const watch = marks.watch(new AbortController().signal);
  const next = watch.next();

  marks.close();

  expect(await next).toEqual({ done: true, value: undefined });
});
