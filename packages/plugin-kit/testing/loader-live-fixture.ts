import type { LiveAnswer } from '@repo/contracts/plugins/page-draw';
import { dataFixture } from '../mocks/data-fixture';

const change = {
  name: 'change',
  label: 'Change the rows',
  description: 'Changes the live rows one way.',
  tier: 'act' as const,
  params: {
    how: { type: 'string' as const, description: 'The change', required: true },
  },
};

const append = {
  name: 'append',
  label: 'Append a line',
  description: 'Appends one line to the log.',
  tier: 'act' as const,
  params: {
    line: { type: 'string' as const, description: 'The line', required: true },
  },
};

/*
 * The live pages the kit's live page tests share (ADR-0050): a log tail that waits for its next line, 2,000
 * keyed rows an Operation changes, a Loader that stops after one value, one that throws, one with a paged
 * list, and a page that says how often each Loader's `finally` ran.
 */
const source = `import { List, ListItem, Text } from '@argo/plugin-kit';

const lines = [];
const rows = Array.from({ length: 2000 }, (_, index) => ({
  key: String(index),
  title: 'Row ' + index,
  ...(index === 0 && { subtitle: 'first' }),
}));
const waiting = new Set();
const finished = { log: 0, rows: 0 };

// Every Loader waiting for a change wakes once.
const changed = () => new Promise((resolve) => waiting.add(resolve));
const wake = () => {
  for (const resolve of waiting) resolve();
  waiting.clear();
};

const changes = {
  prepend: () => rows.unshift({ key: 'new', title: 'new' }),
  move: () => rows.push(rows.shift()),
  rename: () => (rows[0] = { key: rows[0].key, title: 'renamed' }),
  retype: () => (rows[0] = { ...rows[0], text: true }),
  remove: () => rows.splice(1, 1),
};

export function register(argo) {
  argo.operations.register('append', async ({ line }) => {
    lines.push(line);
    wake();
    return { lines: lines.length };
  });

  argo.operations.register('change', async ({ how }) => {
    changes[how]();
    wake();
    return { rows: rows.length };
  });

  argo.pages.define('/log', {
    load: async function* () {
      try {
        for (;;) {
          yield [...lines];
          await changed();
        }
      } finally {
        finished.log += 1;
      }
    },
    render: (shown) => (
      <List>
        {shown.map((line) => <ListItem key={line} title={line} />)}
      </List>
    ),
  });

  argo.pages.define('/rows', {
    load: async function* () {
      try {
        for (;;) {
          yield rows.map((row) => ({ ...row }));
          await changed();
        }
      } finally {
        finished.rows += 1;
      }
    },
    render: (shown) => (
      <List>
        {shown.map((row) =>
          row.text ? (
            <Text key={row.key}>{row.title}</Text>
          ) : (
            <ListItem key={row.key} title={row.title} subtitle={row.subtitle} />
          ),
        )}
      </List>
    ),
  });

  argo.pages.define('/once', {
    load: async function* () {
      yield 'only';
    },
    render: (title) => <ListItem title={title} />,
  });

  argo.pages.define('/throws', {
    load: async function* () {
      yield 'first';
      await changed();
      throw new Error('The tail broke');
    },
    render: (title) => <ListItem title={title} />,
  });

  argo.pages.define('/listed', {
    load: async function* () {
      yield null;
    },
    list: async () => ({ items: [], cursor: null }),
    render: () => <List />,
  });

  argo.pages.define('/finished', {
    load: () => ({ ...finished }),
    render: ({ log, rows }) => <ListItem title={log + ',' + rows} />,
  });
}
`;

// The kit over the live pages, and the Plugin's directory, so a test can make it reload.
export async function start(): Promise<{ kit: Kit; directory: string }> {
  const fixture = await dataFixture(source, { operations: [append, change] });

  return { kit: await fixture.start(), directory: fixture.directory };
}

export type Kit = Awaited<
  ReturnType<Awaited<ReturnType<typeof dataFixture>>['start']>
>;

// Real time a frame waits for the worker before the Plugin clock closes it.
const frameWaitMs = 20;

const liveFrameMs = 16;

/*
 * The next answer on a live subscription. Frames close on the Plugin clock, so the clock moves a frame on
 * each time the answer has not come yet.
 */
export async function nextAnswer(
  kit: Kit,
  answers: AsyncGenerator<LiveAnswer>,
): Promise<LiveAnswer | undefined> {
  const pending = answers.next();
  const settled = pending.then(() => true);

  for (;;) {
    const waited = new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), frameWaitMs);
    });

    if (await Promise.race([settled, waited])) return (await pending).value;

    await kit.clock.advance(liveFrameMs);
  }
}

// How often each live Loader's `finally` ran, as `log,rows`.
export async function finished(kit: Kit): Promise<unknown> {
  const answer = await kit.pages.draw({ path: '/finished' });

  return answer.kind === 'tree' ? answer.root.props.title : answer.kind;
}
