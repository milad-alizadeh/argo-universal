// `pnpm new:story <component-path>`: writes the component's story file from its own variants map and props (docs/agents/storybook-template.md).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  isKitComponentName,
  kitPropDescriptors,
} from '@repo/contracts/plugins/kit-prop-descriptors';
import { declaredProps, type Prop } from './new-story-props.mts';
import { branchesIn, kitComponentIn, renderStory } from './new-story-rules.mts';
import { storySuffix } from './story-file.mts';
import { derivedStoryTitle } from './story-title-rules.mts';

const root = path.resolve(import.meta.dirname, '..');

const kitProps = (component: string): Prop[] =>
  isKitComponentName(component)
    ? kitPropDescriptors(component).map(
        ({ name, required, kind, options }): Prop => ({
          name,
          required,
          kind,
          options,
        }),
      )
    : [];

const relativeImport = /from '(\.{1,2}\/[^']+)'/g;

// The files a component imports by a relative path, where the aliases its props use are declared.
const importedSources = (file: string, source: string): string[] =>
  [...source.matchAll(relativeImport)]
    .map((match) => path.resolve(path.dirname(file), match[1] ?? ''))
    .flatMap((base) => [`${base}.ts`, `${base}.tsx`])
    .flatMap((candidate) =>
      existsSync(candidate) ? [readFileSync(candidate, 'utf8')] : [],
    );

const drawing = /\.tsx?$/;

const skipped = /\.(?:stories|test|mocks)\.tsx?$/;

const folderSources = (folder: string): string[] =>
  readdirSync(folder)
    .filter((file) => drawing.test(file) && !skipped.test(file))
    .map((file) => readFileSync(path.join(folder, file), 'utf8'));

// The export named for the file wins, as `Button` over a kit-only component beside it.
function exportedComponent(source: string, named: string): string {
  const exported = [
    ...source.matchAll(/export (?:const|function) ([A-Z]\w*)/g),
  ].map((match) => match[1] ?? '');

  return exported.find((name) => name === named) ?? exported[0] ?? named;
}

// A kit component's props come from its Contracts schema; any other component's from its own `<Component>Props`.
function propsFor(file: string, component: string, sources: string[]): Prop[] {
  const kitComponent = kitComponentIn(sources);

  if (kitComponent !== undefined) return kitProps(kitComponent);

  const own = readFileSync(file, 'utf8');

  return declaredProps([...sources, ...importedSources(file, own)], component);
}

function storyFor(file: string): string {
  const sources = folderSources(path.dirname(file));
  const title = derivedStoryTitle(path.relative(root, file));
  const named = title.split('/').pop() ?? '';
  const component = exportedComponent(readFileSync(file, 'utf8'), named);

  return renderStory({
    title,
    component,
    importPath: `./${path.basename(file).replace(/\.tsx?$/, '')}`,
    kitComponent: kitComponentIn(sources),
    props: propsFor(file, component, sources),
    branches: branchesIn(sources),
  });
}

function write(argument: string): void {
  const file = path.resolve(process.cwd(), argument);
  const target = file.replace(/\.tsx?$/, storySuffix);

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
