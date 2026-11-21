import { describe, expect, it, vi } from 'vitest';
import { attachMenuActions } from './composer-attach-choices';
import type { AttachLayout } from './composer-toolbar-types';

const insertWord = vi.fn<(word: string) => void>();

function layoutOf(
  wide: boolean,
  props: Partial<AttachLayout['props']> = {},
): AttachLayout {
  return {
    wide,
    inactive: false,
    field: { attach: () => undefined, insertWord },
    props: { onAttachImages: vi.fn<() => void>(), ...props },
  };
}

const command = { name: 'review', description: 'Review a file' };

const rows = (layout: AttachLayout): [string, boolean][] =>
  attachMenuActions(layout).map((action) => [
    action.label,
    Boolean(action.disabled),
  ]);

describe('attachMenuActions', () => {
  it('offers a phone the camera, photos, files and Slash Commands', () => {
    const layout = layoutOf(false, {
      onAttachCamera: vi.fn<() => void>(),
      onAttachFiles: vi.fn<() => void>(),
      slashCommands: [command],
    });

    expect(rows(layout)).toEqual([
      ['Camera', false],
      ['Photos', false],
      ['Files', false],
      ['Slash Commands', false],
    ]);
  });

  it('leaves out the camera and files where the phone has none, and disables what has nothing to run', () => {
    expect(rows(layoutOf(false))).toEqual([
      ['Photos', false],
      ['Slash Commands', true],
    ]);
  });

  it('offers a wide window files, Slash Commands and a Goal', () => {
    const layout = layoutOf(true, { onCreateGoal: vi.fn<() => void>() });

    expect(rows(layout)).toEqual([
      ['Files', false],
      ['Slash Commands', true],
      ['Goal', false],
    ]);
  });

  it('runs the choice it draws', () => {
    const onAttachImages = vi.fn<() => void>();
    const layout = layoutOf(false, {
      onAttachImages,
      slashCommands: [command],
    });
    const [photos, slash] = attachMenuActions(layout);

    photos?.onPress();
    slash?.onPress();

    expect(onAttachImages).toHaveBeenCalledOnce();
    expect(insertWord).toHaveBeenCalledWith('/');
  });
});
