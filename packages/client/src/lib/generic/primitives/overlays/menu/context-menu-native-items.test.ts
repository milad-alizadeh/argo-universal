import { describe, expect, it, vi } from 'vitest';
import { contextMenuSections } from './context-menu-native-items';
import type { NativeMenuItem, NativeMenuSection } from './menu-native-items';

const rename = vi.fn<() => void>();

const archive = vi.fn<() => void>();

const groups = [
  [{ label: 'Rename', icon: 'rename', onPress: rename }],
  [{ label: 'Archive', icon: 'archive', onPress: archive, disabled: true }],
] as const;

// What a section shows: its heading and each row's title and icon.
interface SectionRows {
  title?: string;
  rows: Pick<NativeMenuItem, 'title' | 'icon'>[];
}

const sectionRows = (section: NativeMenuSection): SectionRows => ({
  title: section.title,
  rows: section.items.map(({ title, icon }) => ({ title, icon })),
});

const chooseEach = (sections: NativeMenuSection[]): void => {
  for (const item of sections.flatMap((section) => section.items)) {
    item.choose();
  }
};

describe('a phone’s context menu', () => {
  it('heads its first section with the menu’s title, each group its own section', () => {
    const sections = contextMenuSections({ groups, title: 'Build the layout' });

    expect(sections.map(sectionRows)).toStrictEqual([
      {
        title: 'Build the layout',
        rows: [{ title: 'Rename', icon: 'rename' }],
      },
      { title: undefined, rows: [{ title: 'Archive', icon: 'archive' }] },
    ]);
  });

  it('preserves explicit Action IDs, headings and destructive tone', () => {
    const sections = contextMenuSections({
      title: 'Fallback',
      groupTitles: ['Edit', 'Danger'],
      groups: [
        [{ id: 'rename', label: 'Rename', onPress: rename }],
        [{ id: 'delete', label: 'Delete', tone: 'danger', onPress: archive }],
      ],
    });

    expect(sections.map(actionRows)).toEqual([
      { title: 'Edit', rows: [{ id: 'rename', tone: undefined }] },
      { title: 'Danger', rows: [{ id: 'delete', tone: 'danger' }] },
    ]);
  });

  it('runs the action chosen, and never a disabled one', () => {
    chooseEach(contextMenuSections({ groups }));

    expect(rename).toHaveBeenCalledOnce();
    expect(archive).not.toHaveBeenCalled();
  });
});

interface ActionSectionRows {
  title?: string;
  rows: Pick<NativeMenuItem, 'id' | 'tone'>[];
}

function actionRows({ title, items }: NativeMenuSection): ActionSectionRows {
  return { title, rows: items.map(({ id, tone }) => ({ id, tone })) };
}
