import { describe, expect, it } from 'vitest';
import {
  arrivingTrail,
  firstTrail,
  followText,
  maxRuns,
  piecesOf,
  settledTrail,
  type Trail,
} from './arriving-text';

const hello = 'Hello';

const helloWorld = 'Hello world';

const grown = (texts: string[]): Trail | null =>
  texts.reduce<Trail | null>(
    (trail, text) => followText(trail, text, true),
    null,
  );

describe('the text a streaming block remembers', () => {
  it('fades nothing it already shows when it starts to follow', () => {
    expect(followText(null, hello, true)).toEqual(settledTrail(hello));
  });

  it('marks where new text begins each time the text grows', () => {
    const trail = grown([hello, helloWorld, `${helloWorld} again`]);

    expect(trail).toEqual({ text: `${helloWorld} again`, marks: [5, 11] });
  });

  it('is unchanged by the same text', () => {
    const trail = grown([hello, helloWorld]);

    expect(followText(trail, helloWorld, true)).toBe(trail);
  });

  it('keeps a word in the same run as later chunks finish it', () => {
    const trail = grown(['An', 'An off', 'An office', 'An office door']);

    expect(trail?.marks).toEqual([2, 9]);
    expect(grown(['Tap 👩', 'Tap 👩‍💻', 'Tap 👩‍💻 now'])?.marks).toEqual([
      'Tap 👩‍💻'.length,
    ]);
  });

  it('forgets its marks when markdown changes the text drawn, so nothing on screen fades again', () => {
    const trail = grown(['a', 'a **bo', 'a bo']);

    expect(trail).toEqual(settledTrail('a bo'));
  });

  it('keeps no more runs than can still be fading', () => {
    const texts = Array.from(
      { length: maxRuns + 5 },
      (_unused, index) => `x${' x'.repeat(index)}`,
    );

    const trail = grown(texts);

    expect(trail?.marks).toHaveLength(maxRuns);
    expect(trail?.marks.at(-1)).toBe(2 * (maxRuns + 4) - 1);
  });

  it('fades the whole of a block that starts while its message streams', () => {
    expect(arrivingTrail('New')).toEqual({ text: 'New', marks: [0] });
  });

  it('keeps its runs fading once the block stops growing, then lets go', () => {
    const trail = grown([hello, helloWorld]);

    expect(followText(trail, helloWorld, false)).toBe(trail);
    expect(followText(settledTrail(helloWorld), helloWorld, false)).toBeNull();
    expect(followText(trail, 'Changed', false)).toBeNull();
  });

  it('fades the last text a block is given as the next block starts', () => {
    const trail = grown([hello]);

    expect(followText(trail, helloWorld, false)).toEqual({
      text: helloWorld,
      marks: [5],
    });
  });
});

describe('the trail a block starts with', () => {
  it('fades nothing of a block drawn with its message, and follows it only while it is written', () => {
    expect(firstTrail(hello, { began: false, growing: true })).toEqual(
      settledTrail(hello),
    );
    expect(firstTrail(hello, { began: false, growing: false })).toBeNull();
  });

  it('fades the whole of a block that starts in a message already streaming, even one the same chunk has already finished', () => {
    const whole = { text: hello, marks: [0] };

    expect(firstTrail(hello, { began: true, growing: true })).toEqual(whole);
    expect(firstTrail(hello, { began: true, growing: false })).toEqual(whole);
    expect(followText(whole, hello, false)).toBe(whole);
  });
});

describe('the pieces a run of text is drawn in', () => {
  it('cuts the text where each run began, and fades the pieces that arrived', () => {
    expect(
      piecesOf({ text: `${helloWorld} again`, start: 0 }, [5, 11]),
    ).toEqual([
      { text: hello, start: 0, arriving: false },
      { text: ' world', start: 5, arriving: true },
      { text: ' again', start: 11, arriving: true },
    ]);
  });

  it('places a later run of text by where it starts in the block', () => {
    expect(piecesOf({ text: 'bold', start: 20 }, [5, 22])).toEqual([
      { text: 'bo', start: 20, arriving: true },
      { text: 'ld', start: 22, arriving: true },
    ]);
  });

  it('draws text whole when nothing in it arrived', () => {
    expect(piecesOf({ text: hello, start: 0 }, [5])).toEqual([
      { text: hello, start: 0, arriving: false },
    ]);
    expect(piecesOf({ text: hello, start: 0 }, [])).toEqual([
      { text: hello, start: 0, arriving: false },
    ]);
  });
});
