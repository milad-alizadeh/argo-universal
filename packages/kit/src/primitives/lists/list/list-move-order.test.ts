import type { ListMove } from '@repo/contracts/kit-moves';
import { describe, expect, it, vi } from 'vitest';
import type { MoveSection } from './list-move-model';
import { MoveOrder, type MoveAnswer } from './list-move-order';

const board: MoveSection[] = [
  { key: 'a', id: 'todo', title: 'To do', rows: ['login', 'docs'] },
  { key: 'b', id: 'done', title: 'Done', rows: [] },
];

const toDone: ListMove = { id: 'login', section: 'done', index: 0 };

const docsToDone: ListMove = { id: 'docs', section: 'done', index: 0 };

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
      { base: board, onMove, lanes: false },
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
  it('shows a move at once and tells where it landed', () => {
    const { order } = harness(answers());

    order.move(toDone);

    expect(rowsOf(order)).toEqual([['docs'], ['login']]);
    expect(order.notice).toEqual({
      text: 'Moved to Done, position 1',
      count: 1,
    });
  });

  it('puts a refused move back, with one toast', async () => {
    const run = harness(() => Promise.reject(new Error('no')));

    run.order.move(toDone);
    await run.nextFrame();

    expect(rowsOf(run.order)).toEqual([['login', 'docs'], []]);
    expect(run.toasts).toBe(1);
  });

  it('shows the owner’s order once it draws one after answering', async () => {
    const run = harness(answers());

    const answered: MoveSection[] = [
      { key: 'a', id: 'todo', rows: ['docs'] },
      { key: 'b', id: 'done', rows: ['login'] },
    ];

    run.order.move(toDone);
    await run.nextFrame();
    run.order.own({ base: answered, onMove: answers(), lanes: false });

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

    expect(run.order.held?.move).toBe(docsToDone);
    expect(rowsOf(run.order)).toEqual([['login'], ['docs']]);
  });
});
