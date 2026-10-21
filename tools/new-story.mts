// `pnpm new:story <component-path>`: writes the component's story file from its own variants map and props (docs/agents/storybook-template.md).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  isKitPartName,
  kitPropDescriptors,
} from '@repo/contracts/plugins/kit-prop-descriptors';
import {
  branchesIn,
  derivedTitle,
  kitPartIn,
  type Prop,
  renderStory,
} from './new-story-rules.mts';

const root = path.resolve(import.meta.dirname, '..');

const kitProps = (part: string | undefined): Prop[] =>
  part !== undefined && isKitPartName(part)
    ? kitPropDescriptors(part).map(
        ({ name, required, kind, options }): Prop => ({
          name,
          required,
          kind,
          options,
        }),
      )
    : [];

const drawing = /\.tsx?$/;

const skipped = /\.(?:stories|test|mocks)\.tsx?$/;

const folderSources = (folder: string): string[] =>
  readdirSync(folder)
    .filter((file) => drawing.test(file) && !skipped.test(file))
    .map((file) => readFileSync(path.join(folder, file), 'utf8'));

// The export named for the file wins, as `Button` over the kit-only `DrawnButton` beside it.
function exportedComponent(source: string, named: string): string {
  const exported = [
    ...source.matchAll(/export (?:const|function) ([A-Z]\w*)/g),
  ].map((match) => match[1] ?? '');

  return exported.find((name) => name === named) ?? exported[0] ?? named;
}

function storyFor(file: string): string {
  const sources = folderSources(path.dirname(file));
  const kitPart = kitPartIn(sources);
  const title = derivedTitle(path.relative(root, file));
  const named = title.split('/').pop() ?? '';

  return renderStory({
    title,
    component: exportedComponent(readFileSync(file, 'utf8'), named),
    importPath: `./${path.basename(file).replace(/\.tsx?$/, '')}`,
    kitPart,
    props: kitProps(kitPart),
    branches: branchesIn(sources),
  });
}

function write(argument: string): void {
  const file = path.resolve(process.cwd(), argument);
  const target = file.replace(/\.tsx?$/, '.stories.tsx');

  if (existsSync(target))
    throw new Error(`${path.relative(root, target)} already exists`);

  writeFileSync(target, storyFor(file));
  execFileSync(path.join(root, 'node_modules/.bin/oxfmt'), [target]);
  console.log(`new:story: wrote ${path.relative(root, target)}`);
}

const [argument] = process.argv.slice(2);

if (argument === undefined)
  throw new Error('usage: pnpm new:story <component-path>');

write(argument);
