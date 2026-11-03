import { expect, it } from 'vitest';
import { StaleMarks } from './stale-marks';

const issues = '/issues/:project';

it('tells a watching App the patterns an Operation marked, and skips an empty mark', async () => {
  const marks = new StaleMarks();
  const abort = new AbortController();
  const watch = marks.watch(abort.signal);
  const first = watch.next();

  marks.mark({ pluginId: 'tracker', stale: [] });
  marks.mark({ pluginId: 'tracker', stale: [issues] });

  expect(await first).toEqual({
    done: false,
    value: { pluginId: 'tracker', stale: [issues] },
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

it('joins the marks a Plugin makes at the same moment into one, so one write draws each page once', async () => {
  const marks = new StaleMarks();
  const abort = new AbortController();
  const watch = marks.watch(abort.signal);
  const first = watch.next();

  marks.mark({ pluginId: 'tracker', stale: [issues] });
  await new Promise((settle) => setTimeout(settle, 1));
  marks.mark({ pluginId: 'tracker', stale: [issues, '/labels'] });

  expect(await first).toEqual({
    done: false,
    value: { pluginId: 'tracker', stale: [issues, '/labels'] },
  });

  const second = watch.next();

  abort.abort();
  expect(await second).toEqual({ done: true, value: undefined });
});
