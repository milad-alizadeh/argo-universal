import {
  pluginOperationTypes,
  pluginTypesFile,
} from './plugin-operation-types';
import { PluginManifest } from './plugins';

/*
 * The one template `plugin.new` writes: the smallest working Plugin. One page is `{ state, load, render }`,
 * one Operation writes and calls `argo.changed()`, and one harness test opens the page and presses its button.
 * It is written to pass the repository's own lint, so a Plugin kept in this repository needs no clean-up.
 */
const indexSource = `import type { Argo } from '@argo/plugin-kit';
import { registerNotes } from './notes';
import { defineNotesPage } from './notes-page';

export function register(argo: Argo): void {
  registerNotes(argo);
  defineNotesPage(argo);
}
`;

const notesSource = `import type { Argo } from '@argo/plugin-kit';

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

const pageSource = `import {
  Button,
  EmptyState,
  List,
  ListItem,
  Screen,
  type Argo,
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

// A page is { state, load, render }: load reads, render is pure, and an event is a value made by \`to\`.
export function defineNotesPage(argo: Argo): void {
  argo.pages.define('/', {
    load: listNotes,
    render: (notes, to) => (
      <Screen title="{{name}}">
        <Button
          label="Add a note"
          variant="primary"
          onPress={to.run('addNote', { text: \`Note \${notes.length + 1}\` })}
        />
        <NotesList notes={notes} />
      </Screen>
    ),
  });
}
`;

const testSource = `import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('the page starts empty, and adding a note lists it', async ({ pages }) => {
  const page = await pages.open({ path: '/' });

  assert.equal(page.find('No notes yet').type, 'EmptyState');

  const after = await page.press('Add a note');

  assert.equal(after.find('Note 1').type, 'ListItem');
});
`;

const manifestSource = `{
  "id": "{{id}}",
  "name": "{{name}}",
  "version": "0.0.1",
  "engines": { "argo": ">=0.0.0 <1.0.0" },
  "main": "index.tsx",
  "icon": { "sf": "note.text", "material": "sticky_note_2" },
  "contributes": {
    "nav": [{ "id": "home", "title": "{{name}}", "path": "/" }],
    "operations": [
      {
        "name": "addNote",
        "label": "Add a note",
        "description": "Add one note to the list on the {{name}} page.",
        "tier": "act",
        "keywords": ["note", "add"],
        "params": {
          "text": {
            "type": "string",
            "description": "The note's text.",
            "required": true
          }
        }
      }
    ]
  }
}
`;

// \`pnpm check\` runs on the Plugin alone, with no repository script and no turbo: the whole gate for a Plugin.
const packageSource = `{
  "name": "@argo/{{id}}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "argo-plugin types . --check && tsc --noEmit && tsc --noEmit -p tsconfig.test.json && argo-plugin validate . && argo-plugin test .",
    "test": "argo-plugin test .",
    "types": "argo-plugin types .",
    "validate": "argo-plugin validate ."
  },
  "devDependencies": {
    "@argo/plugin-kit": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  }
}
`;

const tsconfigSource = `{ "extends": "@argo/plugin-kit/tsconfig.json" }
`;

const tsconfigTestSource = `{ "extends": "@argo/plugin-kit/tsconfig.test.json" }
`;

const fill = (source: string, values: Record<string, string>): string =>
  source.replaceAll(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');

// The template's files by path, relative to the Plugin's folder, with the Operation types its manifest makes.
export function pluginTemplate(id: string, name: string): [string, string][] {
  const values = { id, name };
  const manifest = fill(manifestSource, values);

  return [
    ['plugin.json', manifest],
    ['package.json', fill(packageSource, values)],
    ['tsconfig.json', tsconfigSource],
    ['tsconfig.test.json', tsconfigTestSource],
    ['index.tsx', indexSource],
    ['notes.ts', notesSource],
    ['notes-page.tsx', fill(pageSource, values)],
    ['index.test.ts', testSource],
    [pluginTypesFile, operationTypes(manifest)],
  ];
}

// The file `argo-plugin types --check` expects beside this manifest.
const operationTypes = (manifest: string): string =>
  pluginOperationTypes(PluginManifest.parse(JSON.parse(manifest))) ?? '';
