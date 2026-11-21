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
    field: { attach: vi.fn<() => void>(), insertWord },
    props: { onAttachImages: vi.fn<() => void>(), ...props },
  };
}

const slashCommands = 'Commands';

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
      [slashCommands, false],
    ]);
  });

  it('leaves out the camera and files where the phone has none, and disables what has nothing to run', () => {
    expect(rows(layoutOf(false))).toEqual([
      ['Photos', false],
      [slashCommands, true],
    ]);
  });

  it('offers a wide window files, Slash Commands and a Goal', () => {
    const layout = layoutOf(true, { onCreateGoal: vi.fn<() => void>() });

    expect(rows(layout)).toEqual([
      ['Files', false],
      [slashCommands, true],
      ['Goal', false],
    ]);
  });

  it('runs the photo choice', () => {
    const onAttachImages = vi.fn<() => void>();
    const [photos] = attachMenuActions(layoutOf(false, { onAttachImages }));

    photos?.onPress();

    expect(onAttachImages).toHaveBeenCalledOnce();
  });

  it('writes a slash into the field for Slash Commands', () => {
    const layout = layoutOf(false, { slashCommands: [command] });
    const slash = attachMenuActions(layout).at(-1);

    slash?.onPress();

    expect(insertWord).toHaveBeenCalledWith('/');
  });
});
