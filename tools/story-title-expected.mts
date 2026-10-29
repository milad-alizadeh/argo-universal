import {
  neighboursOf,
  type Neighbours,
  subjectBeside,
  testFile,
  type Subject,
  type StoryTitles,
} from './story-title-neighbours.mts';
import {
  type Expected,
  leafOf,
  leafTitle,
  nowhere,
  packageOf,
  pascal,
  pathIn,
  placedIn,
  type Rule,
  type StoryPath,
} from './story-title-path.mts';

export type { StoryTitles } from './story-title-neighbours.mts';

/*
 * Exception 2: a test's title is its subject's title under `Tests/`, so a component's tests hang off
 * the component and not off a flat shadow tree. The subject is the presentation story beside it, by
 * the title that story declares; the rest of the test file's name is the aspect segment (#1197).
 */
const noTitles: StoryTitles = new Map();

// `Tests/Composer/Composer/Send` says Composer twice; the sidebar reads it once.
const collapsed = (title: string): string =>
  title
    .split('/')
    .filter(
      (segment, index, all): boolean =>
        index === 0 || segment !== all[index - 1],
    )
    .join('/');

const aspectTitle = (aspect: readonly string[]): string =>
  aspect.length === 0 ? '' : `/${pascal(aspect.join('-'))}`;

const testTitle = ({ title, aspect }: Subject): string =>
  collapsed(`Tests/${title}${aspectTitle(aspect)}`);

const underTests = (expected: Expected): Expected => {
  if (expected.kind === 'prefix')
    return {
      kind: 'prefix',
      prefix: `Tests/${expected.prefix}`,
      seed: collapsed(`Tests/${expected.seed}`),
      why: expected.why,
    };

  return expected.kind === 'exact'
    ? { kind: 'exact', title: collapsed(`Tests/${expected.title}`) }
    : expected;
};

/*
 * No presentation story beside it: the test's own folder is its subject's folder, so the same rules
 * derive the subject's title from it. A folder no story group belongs to leaves the leaf alone.
 */
function testSubject(path: StoryPath): StoryPath {
  return {
    ...path,
    base: path.base.replace(testFile, ''),
    component: pascal(path.dirs.at(-1) ?? ''),
  };
}

const derivedTestExpected = (
  rules: readonly Rule[],
  path: StoryPath,
): Expected => {
  const subject = testSubject(path);

  const under = placedIn(rules, subject);

  return under.kind === 'none'
    ? {
        kind: 'exact',
        title: `Tests/${leafTitle(leafOf(subject.dirs, subject))}`,
      }
    : underTests(under);
};

const testExpected = (
  rules: readonly Rule[],
  path: StoryPath,
  neighbours: Neighbours,
): Expected => {
  const subject = subjectBeside(neighbours);

  return subject === undefined
    ? derivedTestExpected(rules, path)
    : { kind: 'exact', title: testTitle(subject) };
};

const expectedFor = (
  rules: readonly Rule[],
  path: StoryPath,
  neighbours: Neighbours,
): Expected =>
  testFile.test(path.base)
    ? testExpected(rules, path, neighbours)
    : placedIn(rules, path);

// The title the file's own path derives, which the check compares and `pnpm new:story` writes.
export const expectedTitle = (
  file: string,
  component?: string,
  titles: StoryTitles = noTitles,
): Expected => {
  const found = packageOf(file);

  if (found === undefined) return nowhere();

  const path = pathIn(found[0], file, component);

  return expectedFor(found[1], path, neighboursOf(file, path, titles));
};
