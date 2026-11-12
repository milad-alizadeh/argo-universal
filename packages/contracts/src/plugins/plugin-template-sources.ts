/*
 * The one template `plugin.new` writes: the smallest working Plugin. One page is `{ state, load, render }`,
 * one Operation writes and calls `argo.changed()`, and one harness test opens the page and presses its button.
 * It is written to pass the repository's own lint, so a Plugin kept in this repository needs no clean-up.
 */
export const indexSource = `import type { Argo } from '@argo/plugin-kit';
import { registerNotes } from './notes';
import { defineNotesPage } from './notes-page';

export function register(argo: Argo): void {
  registerNotes(argo);
  defineNotesPage(argo);
}
`;

export const notesSource = `import type { Argo } from '@argo/plugin-kit';

export type Note = { id: number; text: string };

// Notes live in the Plugin's memory, so a restart empties them. Keep them in \`argo.storage\` to outlast one.
const notes: Note[] = [];

export const listNotes = (): Note[] => notes.toReversed();

// The write a button runs: declared in plugin.json, and \`argo.changed()\` redraws every page that shows the notes.
export function registerNotes(argo: Argo): void {
  argo.operations.register('addNote', ({ text }) => {
    notes.push({ id: notes.length + 1, text });
    argo.changed();
  });
}
`;

export const pageSource = `import {
  Button,
  EmptyState,
  List,
  ListItem,
  Screen,
  type Argo,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { listNotes, type Note } from './notes';

function NotesList({ notes }: { notes: Note[] }): JSX.Element {
  if (notes.length === 0)
    return (
      <EmptyState title="No notes yet" description="Add one with the button." />
    );

  return (
    <List>
      {notes.map(({ id, text }) => (
        <ListItem key={String(id)} title={text} />
      ))}
    </List>
  );
}

// A child component takes \`to\` as a \`PageTo\`, and makes its events with it.
function AddNote({ count, to }: { count: number; to: PageTo }): JSX.Element {
  return (
    <Button
      label="Add a note"
      variant="primary"
      onPress={to.run('addNote', { text: \`Note \${count + 1}\` })}
    />
  );
}

// A page is { state, load, render }: load reads, render is pure, and an event is a value made by \`to\`.
export function defineNotesPage(argo: Argo): void {
  argo.pages.define('/', {
    load: listNotes,
    render: (notes, to) => (
      <Screen title="{{name}}">
        <AddNote count={notes.length} to={to} />
        <NotesList notes={notes} />
      </Screen>
    ),
  });
}
`;

export const testSource = `import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('the page starts empty, and adding a note lists it', async ({ pages }) => {
  const page = await pages.open({ path: '/' });

  assert.equal(page.find('No notes yet').type, 'EmptyState');

  const after = await page.press('Add a note');

  assert.equal(after.find('Note 1').type, 'ListItem');
});
`;
