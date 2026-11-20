import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { appended, clientText, opened } from '#mocks/conversation-marker-drawing';
import { VoiceMarkerFilter } from './marker-filter';

// What a client draws of the events through one subscriber's filter.
function drawn(events: FeedSubscribeOutput[]): string {
  const filter = new VoiceMarkerFilter();

  return clientText(events, (event) => filter.output(event));
}

// The marks of what the voice may say; `[ANALYSIS]` hides what it marks too.
const marks = ['[STATUS]', '[COMPLETE]'];

it.each(marks)(
  'hides %s that arrives split across chunks, and the space after it',
  (mark) => {
    const middle = Math.floor(mark.length / 2);

    expect(
      drawn([
        opened(''),
        appended(mark.slice(0, middle), 0),
        appended(`${mark.slice(middle)} `, middle),
        appended('Looking', mark.length + 1),
      ]),
    ).toBe('Looking');
  },
);

it.each(marks)(
  'hides %s that opens an upsert row, and the space after it',
  (mark) => {
    expect(
      drawn([opened(`${mark} Looking`), appended(' on', mark.length + 8)]),
    ).toBe('Looking on');
  },
);

it('hides analysis that arrives split across chunks, with its mark', () => {
  expect(
    drawn([
      opened(''),
      appended('[ANAL', 0),
      appended('YSIS] Looking', 5),
      appended(' closer\n[COMPLETE] Found it.', 18),
    ]),
  ).toBe('Found it.');
});

it('hides analysis that opens an upsert row', () => {
  expect(drawn([opened('[ANALYSIS] Looking'), appended(' on', 18)])).toBe('');
});

it('hides a mark whose last character arrives with the text after it', () => {
  expect(drawn([opened('[STATUS'), appended('] Looking', 7)])).toBe('Looking');
});

it('shows text that only starts like a mark once it is known to be text', () => {
  expect(drawn([opened('[ST'), appended('ill here', 3)])).toBe('[STill here');
});

it('passes a message without a mark as it comes', () => {
  expect(drawn([opened('Hello'), appended(' there', 5)])).toBe('Hello there');
});

const file = 'The file is at /tmp/index.html.';

it.each(marks)('hides %s that opens a later paragraph', (mark) => {
  expect(drawn([opened(`Done.\n\n${mark} ${file}`)])).toBe(`Done.\n\n${file}`);
});

it.each(marks)(
  'hides %s that opens a later paragraph of a settled row',
  (mark) => {
    expect(
      drawn([opened(`[STATUS] Done.\n\n${mark} ${file}`, 'settled')]),
    ).toBe(`Done.\n\n${file}`);
  },
);

it('hides analysis that opens a later paragraph, up to the next mark', () => {
  expect(
    drawn([
      opened(`Done.\n\n[ANALYSIS] ${file}\nStill silent.\n[STATUS] More.`),
    ]),
  ).toBe('Done.\n\nMore.');
});

it('hides analysis that opens a later paragraph of a settled row', () => {
  expect(
    drawn([opened(`[STATUS] Done.\n\n[ANALYSIS] ${file}`, 'settled')]),
  ).toBe('Done.\n\n');
});

it.each(marks)(
  'hides %s that opens a later paragraph, split across chunks',
  (mark) => {
    const middle = Math.floor(mark.length / 2);
    const head = '[COMPLETE] Done.\n';

    expect(
      drawn([
        opened('[COMPLETE] Done.'),
        appended('\n', head.length - 1),
        appended(`\n${mark.slice(0, middle)}`, head.length),
        appended(`${mark.slice(middle)} ${file}`, head.length + 1 + middle),
      ]),
    ).toBe(`Done.\n\n${file}`);
  },
);

it('shows a later line that only starts like a mark once it is known to be text', () => {
  expect(drawn([opened('Done.\n[ST'), appended('ill here', 9)])).toBe(
    'Done.\n[STill here',
  );
});

const reported =
  '[STATUS] Found it.\n\n[ANALYSIS] The data comes from Open-Meteo.\n  [COMPLETE] Done [STATUS] now.';

const shownReport = 'Found it.\n\n  Done [STATUS] now.';

// The message in chunks of `size` characters, each appended where the last ended.
const inChunks = (text: string, size: number): FeedSubscribeOutput[] => {
  const events = [opened('')];

  for (let off = 0; off < text.length; off += size)
    events.push(appended(text.slice(off, off + size), off));

  return events;
};

it.each([1, 2, 3, 5, 8, 13])(
  'draws a message the same in chunks of %i characters as whole',
  (size) => {
    expect(drawn([opened(reported)])).toBe(shownReport);
    expect(drawn(inChunks(reported, size))).toBe(shownReport);
  },
);

it('leaves a mark in the middle of a line alone', () => {
  expect(drawn([opened('Done [COMPLETE]'), appended(' ok', 15)])).toBe(
    'Done [COMPLETE] ok',
  );
});
