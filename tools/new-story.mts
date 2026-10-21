/*
 * `pnpm new:story <component-path>` writes the story file ADR-0040 describes, read from the component's own source:
 * the title derived from the path, `component:`, `argTypes` from the props it declares, and one story per branch.
 * It never invents a prop value, and never a combination: a pair story is the author's call.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceTree } from './source-tree.mts';
import { branchesIn } from './story-branches.mts';
import { storyDraft } from './story-draft.mts';
import { declaredProps, kitPartName, kitProps } from './story-props.mts';
import { storyText } from './story-text.mts';
import { componentName, storyPath, storyTitle } from './story-title.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

const fail = (message: string): never => {
  console.error(`new:story: ${message}`);
  process.exit(1);
};

const SOURCE = /\.tsx?$/;

const GENERATED = /\.(?:stories|test|mocks)\./;

/*
 * A component's folder holds its own sources, its platform drawings among them, and a platform fork is a branch
 * like any other. Its stories, tests and mocks are not where it writes its branches down.
 */
const siblingSources = (folder: string): string[] =>
  readdirSync(folder)
    .filter((name): boolean => SOURCE.test(name) && !GENERATED.test(name))
    .map((name): string => join(folder, name));

const treesOf = (folder: string): ReturnType<typeof sourceTree>[] =>
  siblingSources(folder).map((file): ReturnType<typeof sourceTree> =>
    sourceTree(readFileSync(file, 'utf8')),
  );

const KIT_ARG_TYPES_FALLBACK = '#lib/generic/kit-arg-types';

const IMPORT_OF = /from '([^']*kit-arg-types)'/;

/*
 * How this repo's story files import `kitArgTypes` today, read from one of them rather than written down here,
 * so the generator keeps working when #1210 moves the kit into `@repo/kit`.
 */
function kitArgTypesFrom(): string {
  const found = execFileSync(
    'git',
    [
      'grep',
      '-h',
      '-m1',
      '-e',
      "from '.*kit-arg-types'",
      '--',
      '*.stories.tsx',
    ],
    { cwd: root, encoding: 'utf8' },
  );

  return IMPORT_OF.exec(found)?.[1] ?? KIT_ARG_TYPES_FALLBACK;
}

interface Subject {
  readonly path: string;
  readonly title: string;
  readonly component: string;
}

const subjectAt = (path: string): Subject => {
  const title = storyTitle(relative(root, path));

  if (title === undefined)
    return fail(
      `${relative(root, path)} sits in no story group; see docs/agents/storybook.md.`,
    );

  return { path, title, component: componentName(path) };
};

const propsOf = (
  trees: ReturnType<typeof sourceTree>[],
  component: string,
): ReturnType<typeof kitProps> => {
  const part = kitPartName(trees);

  return part === undefined ? declaredProps(trees, component) : kitProps(part);
};

function draftFor(subject: Subject): string {
  const trees = treesOf(dirname(subject.path));
  const kitPart = kitPartName(trees);
  const props = propsOf(trees, subject.component);

  const draft = storyDraft({
    title: subject.title,
    component: subject.component,
    kitPart,
    props,
    branches: branchesIn(trees),
  });

  if (kitPart !== undefined && props.length === 0)
    console.log(
      `new:story: ${kitPart} has no schema to read, so its branches are the ones its own source writes down.`,
    );

  report(draft);

  return storyText({
    draft,
    kitArgTypesFrom: kitArgTypesFrom(),
    componentFrom: `./${basename(subject.path).replace(SOURCE, '')}`,
  });
}

function report(draft: ReturnType<typeof storyDraft>): void {
  const names = draft.stories.map((plan): string => plan.name).join(', ');

  console.log(`new:story: ${draft.title}`);
  console.log(`new:story: ${draft.stories.length} branches: ${names}`);

  if (draft.title.startsWith('Screens/'))
    console.log(
      'new:story: a screen is titled for its section and its visible page title, which the path does not carry; check the title.',
    );

  if (draft.unseeded.length > 0)
    console.log(
      `new:story: fill in the required props it could not seed: ${draft.unseeded.join(', ')}`,
    );
}

const drawable = (path: string): boolean =>
  existsSync(path) && path.endsWith('.tsx') && !GENERATED.test(basename(path));

const target = (given: string | undefined): string => {
  if (given === undefined) return fail('name the component file to draw.');

  const path = resolve(root, given);

  return drawable(path) ? path : fail(`${given} is not a component file.`);
};

const guardExisting = (file: string, force: boolean): void => {
  if (existsSync(file) && !force)
    fail(`${relative(root, file)} already exists; pass --force to replace it.`);
};

function main(argv: string[]): void {
  const path = target(argv.find((value): boolean => !value.startsWith('--')));
  const file = storyPath(path);

  guardExisting(file, argv.includes('--force'));
  writeFileSync(file, draftFor(subjectAt(path)));
  execFileSync(join(root, 'node_modules/.bin/oxfmt'), [file], { cwd: root });
  console.log(`new:story: wrote ${relative(root, file)}`);
}

main(process.argv.slice(2));
