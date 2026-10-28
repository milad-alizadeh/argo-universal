import { describe, expect, it, vi } from 'vitest';
import {
  sectionKey,
  type MoveSection,
  type ResolvedMove,
} from './list-move-model';
import { MoveOrder, type MoveAnswer } from './list-move-order';

const board: MoveSection[] = [
  { key: sectionKey('a'), id: 'todo', title: 'To do', rows: ['login', 'docs'] },
  { key: sectionKey('b'), id: 'done', title: 'Done', rows: [] },
];

// The order shows a resolved move's notice as it is given.
const toDoneFirst = 'Notice of the move to Done';

const toDone: ResolvedMove = {
  move: { id: 'login', section: 'done', index: 0 },
  notice: toDoneFirst,
};

const docsToDone: ResolvedMove = {
  move: { id: 'docs', section: 'done', index: 0 },
  notice: toDoneFirst,
};

interface Harness {
  order: MoveOrder;
  toasts: number;
  // Runs the frames asked for so far, once every answer has settled.
  nextFrame: () => Promise<void>;
}

function harness(onMove: MoveAnswer): Harness {
  const frames: (() => void)[] = [];

  const result: Harness = {
    toasts: 0,
    order: new MoveOrder(
      { base: board, onMove, lanes: false, titles: new Map() },
      {
        report: async (answer) => {
          await Promise.resolve(answer()).catch(() => (result.toasts += 1));
        },
        frame: (step) => frames.push(step),
      },
    ),
    nextFrame: async () => {
      await new Promise((done) => setTimeout(done));

      for (const frame of frames.splice(0)) frame();
    },
  };

  return result;
}

const rowsOf = (order: MoveOrder): string[][] =>
  order.sections.map((section) => [...section.rows]);

const answers = vi.fn<MoveAnswer>;

// An answer that never comes, so its move stays held.
const pending = (): Promise<void> => new Promise(() => {});

describe('MoveOrder', () => {
  it('shows a move at once', () => {
    const { order } = harness(answers());

    order.move(toDone);

    expect(rowsOf(order)).toEqual([['docs'], ['login']]);
  });

  it('tells where a move landed', () => {
    const { order } = harness(answers());

    order.move(toDone);

    expect(order.notice).toEqual({ text: toDoneFirst, count: 1 });
  });

  it('puts a refused move back', async () => {
    const run = harness(() => Promise.reject(new Error('no')));

    run.order.move(toDone);
    await run.nextFrame();

    expect(rowsOf(run.order)).toEqual([['login', 'docs'], []]);
  });

  it('reports a refused move with one toast', async () => {
    const run = harness(() => Promise.reject(new Error('no')));

    run.order.move(toDone);
    await run.nextFrame();

    expect(run.toasts).toBe(1);
  });

  it('shows the owner’s order once it draws one after answering', async () => {
    const run = harness(answers());

    const answered: MoveSection[] = [
      { key: sectionKey('a'), id: 'todo', rows: ['docs'] },
      { key: sectionKey('b'), id: 'done', rows: ['login'] },
    ];

    run.order.move(toDone);
    await run.nextFrame();
    run.order.own({
      base: answered,
      onMove: answers(),
      lanes: false,
      titles: new Map(),
    });

    expect(run.order.held).toBeNull();
    expect(run.order.sections).toBe(answered);
  });

  it('keeps a second move held while the first one settles', async () => {
    const first = Promise.withResolvers<void>();
    const run = harness(answers(pending).mockReturnValueOnce(first.promise));

    run.order.move(toDone);
    run.order.move(docsToDone);
    first.resolve();
    await run.nextFrame();

    expect(run.order.held?.move).toBe(docsToDone.move);
    expect(rowsOf(run.order)).toEqual([['login'], ['docs']]);
  });

  it('offers the first row of a Section only a step down', () => {
    expect(harness(answers()).order.menuOf('login')).toBe('down');
  });

  it('offers no menu for a row it does not hold', () => {
    expect(harness(answers()).order.menuOf('nowhere')).toBeUndefined();
  });

  it('opens the Move to… picker for one row', () => {
    const { order } = harness(answers());

    order.pick('docs');

    expect(order.picking).toBe('docs');
  });

  it('closes the Move to… picker', () => {
    const { order } = harness(answers());

    order.pick('docs');
    order.closePicker();

    expect(order.picking).toBeUndefined();
  });
});
