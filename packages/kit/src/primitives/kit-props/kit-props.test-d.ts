import { expectTypeOf } from 'vitest';
import type { KitProps } from './index';

/*
 * App kit props come from the Contracts schemas through the one mapping Plugin JSX also uses. The App draws
 * its own choices and nodes and receives handlers alone, inside nested action data too. The compiler runs
 * these checks; a failing one is a type error.
 */
type DrawnNode = { drawn: true };

type ActionMenu = Extract<KitProps<'Menu'>, { actions: unknown }>;

expectTypeOf<ActionMenu['actions'][number]['onPress']>().toEqualTypeOf<
  () => void
>();

expectTypeOf<ActionMenu['onValueChange']>().toEqualTypeOf<undefined>();

expectTypeOf<KitProps<'Callout', string, DrawnNode>['actions']>().toEqualTypeOf<
  DrawnNode | undefined
>();

expectTypeOf<KitProps<'Canvas.Group'>['translate']>().toEqualTypeOf<
  [number, number] | undefined
>();
