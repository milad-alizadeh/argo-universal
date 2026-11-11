import {
  pluginOperationTypes,
  pluginTypesFile,
} from './plugin-operation-types';
import {
  indexSource,
  notesSource,
  pageSource,
  testSource,
} from './plugin-template-sources';
import { PluginManifest } from './plugins';

/*
 * The one template `plugin.new` writes: the smallest working Plugin. One page is `{ state, load, render }`,
 * one Operation writes and calls `argo.changed()`, and one harness test opens the page and presses its button.
 */
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
