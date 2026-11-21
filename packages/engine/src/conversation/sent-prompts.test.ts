import { expect, it } from 'vitest';
import { SentPrompts } from './sent-prompts';

const cases: {
  name: string;
  steps: (p: SentPrompts) => boolean[];
  flips: boolean[];
  running: boolean;
  nextInstructs: boolean;
}[] = [
  {
    name: 'a started Prompt runs until it ends',
    steps: (p) => {
      const a = p.send();

      return [a.started(), a.ended()];
    },
    flips: [false, true],
    running: false,
    nextInstructs: false,
  },
  {
    name: 'a queued Prompt is not counted twice once its Turn starts',
    steps: (p) => {
      const a = p.send();

      return [a.queued(), a.started(), a.started(), a.ended()];
    },
    flips: [true, true, false, true],
    running: false,
    nextInstructs: false,
  },
  {
    name: 'a queued Prompt that never starts gives the instruction back',
    steps: (p) => {
      const a = p.send();

      return [a.queued(), a.neverStarted(), a.neverStarted()];
    },
    flips: [true, false, false],
    running: false,
    nextInstructs: true,
  },
  {
    name: 'a rejected send is not counted and gives the instruction back',
    steps: (p) => {
      const a = p.send();

      return [a.rejected(), a.rejected()];
    },
    flips: [true, false],
    running: false,
    nextInstructs: true,
  },
  {
    name: 'a Prompt that ended with nothing ends once',
    steps: (p) => {
      const a = p.send();

      return [a.started(), a.ended(), a.ended()];
    },
    flips: [false, true, false],
    running: false,
    nextInstructs: false,
  },
];

it.each(cases)('$name', ({ steps, flips, running, nextInstructs }) => {
  const prompts = new SentPrompts();

  expect(steps(prompts)).toEqual(flips);
  expect(prompts.running).toBe(running);
  expect(prompts.send().instructs).toBe(nextInstructs);
});

it('keeps running while one of two concurrent Prompts is still at work', () => {
  const prompts = new SentPrompts();
  const a = prompts.send();
  const b = prompts.send();

  expect([a.startedRunning, b.startedRunning]).toEqual([true, false]);
  expect([a.started(), b.started()]).toEqual([false, false]);
  expect(a.ended()).toBe(false);
  expect(prompts.running).toBe(true);
  expect(b.ended()).toBe(true);
  expect(prompts.running).toBe(false);
});

it('keeps another Prompt running when a queued one never starts, and gives the instruction back', () => {
  const prompts = new SentPrompts();
  const queued = prompts.send();
  const other = prompts.send();

  queued.queued();
  other.started();
  expect(queued.neverStarted()).toBe(false);
  expect(prompts.running).toBe(true);
  expect(prompts.send().instructs).toBe(true);
});

it('gives the instruction back when an already counted Prompt reports no Turn started, and still ends it', () => {
  const prompts = new SentPrompts();
  const a = prompts.send();

  a.started();
  expect(a.neverStarted()).toBe(false);
  expect(prompts.running).toBe(true);
  expect(a.ended()).toBe(true);
  expect(prompts.send().instructs).toBe(true);
});

it('re-arms the instruction only by the Prompt that carried it', () => {
  const prompts = new SentPrompts();
  const first = prompts.send();
  const second = prompts.send();

  expect([first.instructs, second.instructs]).toEqual([true, false]);
  second.rejected();
  expect(prompts.send().instructs).toBe(false);
  first.rejected();
  expect(prompts.send().instructs).toBe(true);
});
