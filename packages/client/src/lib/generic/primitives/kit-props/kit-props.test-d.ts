import { expectTypeOf } from 'vitest';
import type { KitProps } from './index';

/*
 * App kit props come from the Contracts schemas through the one mapping Plugin JSX also uses. The App draws
 * its own choices and nodes and receives handlers alone, inside nested action data too. The compiler runs
 * these checks; a failing one is a type error.
 */
type Choice = 'low' | 'high';

type DrawnNode = { drawn: true };

type SinglePicker = Extract<KitProps<'Picker', Choice>, { multiple?: false }>;

type ManyPicker = Extract<KitProps<'Picker', Choice>, { multiple: true }>;

type ActionMenu = Extract<KitProps<'Menu'>, { actions: unknown }>;

expectTypeOf<SinglePicker['value']>().toEqualTypeOf<Choice | undefined>();

expectTypeOf<SinglePicker['onValueChange']>().toEqualTypeOf<
  (payload: Choice) => void
>();

expectTypeOf<ManyPicker['onValueChange']>().toEqualTypeOf<
  (payload: Choice[]) => void
>();

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
