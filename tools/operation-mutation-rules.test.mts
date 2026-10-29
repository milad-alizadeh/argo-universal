import { expect, it } from 'vitest';
import { operationMutationProblems } from './operation-mutation-rules.mts';

const newRouterFile = 'packages/engine/src/new/router.ts';

it('refuses a new hand-written tRPC mutation', () => {
  const source = `export const routes = router({ erase: publicProcedure.input(Input).mutation(() => erase()) });`;

  expect(operationMutationProblems(newRouterFile, source)).toEqual([
    'packages/engine/src/new/router.ts:1: Add an Operation instead of the hand-written mutation erase.',
  ]);
});

it('keeps consent procedures out of Operations', () => {
  const source = `const routes = router({ answerPermission: publicProcedure.input(Input).mutation(() => answer()) });`;

  expect(
    operationMutationProblems('packages/engine/src/sessions/router.ts', source),
  ).toEqual([]);
});

it('does not confuse a string with a hand-written mutation', () => {
  expect(
    operationMutationProblems(
      newRouterFile,
      `const example = 'publicProcedure.mutation(() => erase())';`,
    ),
  ).toEqual([]);
});

it('does not grant the consent exception to another router', () => {
  const source = `const routes = router({ answerPermission: publicProcedure.mutation(() => answer()) });`;

  expect(operationMutationProblems(newRouterFile, source)).toEqual([
    'packages/engine/src/new/router.ts:1: Add an Operation instead of the hand-written mutation answerPermission.',
  ]);
});

it('refuses a mutation method taken for later use', () => {
  expect(
    operationMutationProblems(
      newRouterFile,
      'const mutate = publicProcedure.mutation;',
    ),
  ).toEqual([
    'packages/engine/src/new/router.ts:1: Add an Operation instead of the hand-written mutation <unbound>.',
  ]);
});

it('refuses a mutation accessed with brackets', () => {
  const source = `const routes = router({ erase: publicProcedure['mutation'](() => erase()) });`;

  expect(operationMutationProblems(newRouterFile, source)).toEqual([
    'packages/engine/src/new/router.ts:1: Add an Operation instead of the hand-written mutation erase.',
  ]);
});

it('accepts the generated Operation procedures', () => {
  expect(
    operationMutationProblems(
      'packages/engine/src/operations/router.gen.ts',
      'const routes = router({ erase: publicProcedure.mutation(() => erase()) });',
    ),
  ).toEqual([]);
});

it('does not exempt a different generated-looking file', () => {
  expect(
    operationMutationProblems(
      'packages/engine/src/new/router.gen.ts',
      'const routes = router({ erase: publicProcedure.mutation(() => erase()) });',
    ),
  ).toEqual([
    'packages/engine/src/new/router.gen.ts:1: Add an Operation instead of the hand-written mutation erase.',
  ]);
});

it.each(['new', 'prompt'])(
  'refuses the migrated Session %s as a hand-written mutation',
  (name) => {
    const source = `const routes = router({ ${name}: publicProcedure.mutation(() => run()) });`;

    expect(
      operationMutationProblems(
        'packages/engine/src/sessions/router.ts',
        source,
      ),
    ).toEqual([
      `packages/engine/src/sessions/router.ts:1: Add an Operation instead of the hand-written mutation ${name}.`,
    ]);
  },
);
