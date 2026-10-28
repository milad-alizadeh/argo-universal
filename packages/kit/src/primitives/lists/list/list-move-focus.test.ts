import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RowFocus, type FocusRow } from './list-move-feedback';

const frames: FrameRequestCallback[] = [];

// Runs every frame asked for so far.
function nextFrame(): void {
  for (const frame of frames.splice(0)) frame(0);
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) =>
    frames.push(frame),
  );
});

afterEach(() => {
  frames.length = 0;
  vi.unstubAllGlobals();
});

describe('RowFocus', () => {
  it('focuses the moved row a frame after the move', () => {
    const focus = new RowFocus();
    const row = vi.fn<FocusRow>();

    focus.register('alpha', row);
    focus.after('alpha');
    nextFrame();

    expect(row.mock.calls).toEqual([[false]]);
  });

  // On a slow machine the frame comes before the row draws in its new Section, and focuses the copy about to leave.
  it('gives the focus its old copy lost to a moved row that draws anew after the frame', () => {
    const focus = new RowFocus();
    const left = vi.fn<FocusRow>();
    const landed = vi.fn<FocusRow>();
    const unregister = focus.register('alpha', left);

    focus.after('alpha');
    nextFrame();
    unregister();
    focus.register('alpha', landed);
    nextFrame();

    expect(landed.mock.calls).toEqual([[true]]);
  });

  it('leaves other rows that draw after a move alone', () => {
    const focus = new RowFocus();
    const other = vi.fn<FocusRow>();

    focus.after('alpha');
    focus.register('beta', other);
    nextFrame();

    expect(other).not.toHaveBeenCalled();
  });
});
