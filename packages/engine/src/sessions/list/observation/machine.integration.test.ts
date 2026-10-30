import {
  describeModel,
  type ModelFixture,
  modelTest,
  type Vertex,
} from '@repo/vitest/model-test';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type Actor,
  createActor,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import { openSessionListModel } from '#mocks/session-list-model';
import { sessionListMachine } from './machine';

const refreshListEvent = 'list.refresh';

const { input, remove } = openSessionListModel();

afterAll(remove);

const machine = sessionListMachine.provide({
  actors: { observe: fromCallback((): void => {}) },
});

type ListSnapshot = SnapshotFrom<typeof machine>;

const fixtures = [
  { type: refreshListEvent },
  { type: 'list.failed', error: 'Unavailable database' },
  { type: 'list.stop' },
  { type: 'list.flush' },
] satisfies ModelFixture<typeof machine>[];

type ListEvent = (typeof fixtures)[number];

let list: Actor<typeof machine> | undefined;

const running = (): Actor<typeof machine> =>
  list ?? expect.unreachable('The list subscription has not started');

beforeEach((): void => {
  vi.useFakeTimers();
});

afterEach((): void => {
  list?.stop();
  vi.useRealTimers();
});

// A refresh is sent in every state, including those that ignore it.
const accepts = (snapshot: ListSnapshot, event: ListEvent): boolean =>
  event.type === refreshListEvent || snapshot.can(event);

// Each executor sends its own fixture.
const send = (fixture: ListEvent): [string, () => void] => [
  fixture.type,
  (): void => running().send(fixture),
];

function expectSameState(snapshot: ListSnapshot): void {
  expect(running().getSnapshot().value).toEqual(snapshot.value);
  expect(running().getSnapshot().status).toBe(snapshot.status);
}

const model = modelTest(
  machine,
  {
    input,
    fixtures,
    vertex: (snapshot): Vertex => ({ value: snapshot.value }),
    accepts,
    walks: [{ name: 'shortest path', search: 'shortest' }],
  },
  {
    start: (): Actor<typeof machine> => {
      list = createActor(machine, { input }).start();

      return list;
    },
    executors: Object.fromEntries(fixtures.map(send)),
    delays: { listRefreshDelay: 100 },
    always: expectSameState,
    states: {},
  },
);

describe('list subscription model', (): void => {
  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
